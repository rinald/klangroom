import { useState, useRef, useCallback, useEffect } from 'react';
import type { 
  TrackEvent, 
  FreeTrackEvent, 
  RecordingMode, 
  PlaybackState,
  PadAssignments,
  AppSample
} from '@/lib/types';

interface UseTrackRecordingProps {
  audioContext: AudioContext | null;
  bpm: number;
  quantization: number;
  trackLengthBars: number;
  padAssignments: PadAssignments;
  loadedSamples: Record<string, AppSample>;
  playSample: (
    sampleId: string,
    startTimeOffset?: number,
    duration?: number,
    onPlaybackEnd?: () => void,
    associatedPadId?: number
  ) => AudioBufferSourceNode | undefined;
}

export const useTrackRecording = ({
  audioContext,
  bpm,
  quantization,
  trackLengthBars,
  padAssignments,
  loadedSamples,
  playSample
}: UseTrackRecordingProps) => {
  // Recording state
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('quantized');
  const [isRecording, setIsRecording] = useState(false);
  const [quantizedEvents, setQuantizedEvents] = useState<TrackEvent[]>([]);
  const [freeEvents, setFreeEvents] = useState<FreeTrackEvent[]>([]);
  
  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    startTime: null,
    loopEnabled: true
  });

  // Refs for timing
  const recordingStartTimeRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledEventsRef = useRef<NodeJS.Timeout[]>([]);

  // Calculate track duration in seconds
  const trackDurationSeconds = (trackLengthBars * 4 * 60) / bpm;

  // Quantization helpers
  const getQuantizedTime = useCallback((timeSeconds: number) => {
    const beatsPerSecond = bpm / 60;
    const stepsPerBeat = quantization / 4; // e.g., 16th notes = 4 steps per beat
    const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
    return Math.round(timeSeconds / secondsPerStep);
  }, [bpm, quantization]);

  const stepToSeconds = useCallback((step: number) => {
    const beatsPerSecond = bpm / 60;
    const stepsPerBeat = quantization / 4;
    const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
    return step * secondsPerStep;
  }, [bpm, quantization]);

  // Recording functions
  const startRecording = useCallback(() => {
    if (!audioContext) return;
    
    setIsRecording(true);
    recordingStartTimeRef.current = audioContext.currentTime;
    
    // Clear previous recordings based on mode
    if (recordingMode === 'quantized') {
      setQuantizedEvents([]);
    } else {
      setFreeEvents([]);
    }
  }, [audioContext, recordingMode]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    recordingStartTimeRef.current = null;
  }, []);

  const recordEvent = useCallback((padId: number, duration: number) => {
    if (!isRecording || !audioContext || recordingStartTimeRef.current === null) {
      return;
    }

    const currentTime = audioContext.currentTime;
    const timeFromStart = currentTime - recordingStartTimeRef.current;

    // Don't record if beyond track length
    if (timeFromStart >= trackDurationSeconds) {
      console.log('Event beyond track length, stopping recording');
      stopRecording();
      return;
    }

    if (recordingMode === 'quantized') {
      const quantizedStart = getQuantizedTime(timeFromStart);
      const quantizedDuration = Math.max(1, getQuantizedTime(duration));
      
      const newEvent: TrackEvent = {
        padId,
        startTime: quantizedStart,
        duration: quantizedDuration
      };
      
      setQuantizedEvents(prev => [...prev, newEvent]);
    } else {
      // Free recording - exact timing
      const newEvent: FreeTrackEvent = {
        padId,
        startTime: timeFromStart,
        duration,
        audioContextTime: currentTime
      };
      
      setFreeEvents(prev => [...prev, newEvent]);
    }
  }, [isRecording, audioContext, recordingMode, trackDurationSeconds, getQuantizedTime, stopRecording]);

  // Playback functions
  const startPlayback = useCallback(() => {
    if (!audioContext) return;

    const events = recordingMode === 'quantized' ? quantizedEvents : freeEvents;
    if (events.length === 0) return;

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      startTime: audioContext.currentTime,
      currentTime: 0
    }));

    // Clear any existing scheduled events
    scheduledEventsRef.current.forEach(timeout => clearTimeout(timeout));
    scheduledEventsRef.current = [];

    // Schedule all events
    events.forEach(event => {
      const assignment = padAssignments[event.padId];
      if (!assignment || !loadedSamples[assignment.sampleId]) return;

      let scheduleTime: number;
      
      if (recordingMode === 'quantized') {
        scheduleTime = stepToSeconds(event.startTime);
      } else {
        scheduleTime = event.startTime;
      }

      const timeout = setTimeout(() => {
        playSample(
          assignment.sampleId,
          assignment.startTime,
          assignment.duration,
          undefined,
          event.padId
        );
      }, scheduleTime * 1000);

      scheduledEventsRef.current.push(timeout);
    });

    // Update playback position
    playbackIntervalRef.current = setInterval(() => {
      if (!audioContext || playbackState.startTime === null) return;

      const currentTime = audioContext.currentTime - playbackState.startTime;
      
      if (currentTime >= trackDurationSeconds) {
        if (playbackState.loopEnabled) {
          // Restart playback
          stopPlayback();
          setTimeout(startPlayback, 10);
        } else {
          stopPlayback();
        }
      } else {
        setPlaybackState(prev => ({
          ...prev,
          currentTime
        }));
      }
    }, 50); // Update every 50ms for smooth position tracking

  }, [audioContext, recordingMode, quantizedEvents, freeEvents, padAssignments, loadedSamples, playSample, stepToSeconds, trackDurationSeconds, playbackState.startTime, playbackState.loopEnabled]);

  const stopPlayback = useCallback(() => {
    // Clear scheduled events
    scheduledEventsRef.current.forEach(timeout => clearTimeout(timeout));
    scheduledEventsRef.current = [];

    // Clear position update interval
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      startTime: null,
      currentTime: 0
    }));
  }, []);

  const toggleLoop = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      loopEnabled: !prev.loopEnabled
    }));
  }, []);

  const clearTrack = useCallback(() => {
    setQuantizedEvents([]);
    setFreeEvents([]);
    stopPlayback();
  }, [stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledEventsRef.current.forEach(timeout => clearTimeout(timeout));
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  return {
    // Recording
    recordingMode,
    setRecordingMode,
    isRecording,
    startRecording,
    stopRecording,
    recordEvent,
    
    // Events
    quantizedEvents,
    freeEvents,
    currentEvents: recordingMode === 'quantized' ? quantizedEvents : freeEvents,
    
    // Playback
    playbackState,
    startPlayback,
    stopPlayback,
    toggleLoop,
    
    // Utilities
    clearTrack,
    trackDurationSeconds,
    stepToSeconds,
    getQuantizedTime
  };
};