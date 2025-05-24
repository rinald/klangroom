import { useState, useRef, useCallback, useEffect } from 'react';
import type { TrackEvent, FreeTrackEvent, RecordingMode, PadAssignments, AppSample } from '@/lib/types';

interface UseTrackPlaybackProps {
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

export const useTrackPlayback = ({
  audioContext,
  bpm,
  quantization,
  trackLengthBars,
  padAssignments,
  loadedSamples,
  playSample
}: UseTrackPlaybackProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  
  const playbackStartTimeRef = useRef<number | null>(null);
  const schedulerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scheduledAudioNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const trackDurationSeconds = (trackLengthBars * 4 * 60) / bpm;
  const lookaheadTime = 0.1; // 100ms lookahead for precise scheduling

  const stepToSeconds = useCallback((step: number) => {
    const beatsPerSecond = bpm / 60;
    const stepsPerBeat = quantization / 4;
    const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
    return step * secondsPerStep;
  }, [bpm, quantization]);

  const scheduleEvents = useCallback((
    events: (TrackEvent | FreeTrackEvent)[],
    mode: RecordingMode,
    startTime: number
  ) => {
    if (!audioContext) return;

    // Clear any previously scheduled nodes
    scheduledAudioNodesRef.current.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Node might already be stopped
      }
    });
    scheduledAudioNodesRef.current = [];

    events.forEach(event => {
      const assignment = padAssignments[event.padId];
      if (!assignment || !loadedSamples[assignment.sampleId]) return;

      let eventTime: number;
      if (mode === 'quantized') {
        eventTime = stepToSeconds((event as TrackEvent).startTime);
      } else {
        eventTime = (event as FreeTrackEvent).startTime;
      }

      const absoluteTime = startTime + eventTime;

      // Only schedule if the event is in the future (with lookahead)
      if (absoluteTime > audioContext.currentTime - lookaheadTime) {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = loadedSamples[assignment.sampleId].buffer;
        sourceNode.connect(audioContext.destination);

        if (assignment.startTime !== undefined) {
          if (assignment.duration !== undefined) {
            sourceNode.start(absoluteTime, assignment.startTime, assignment.duration);
          } else {
            sourceNode.start(absoluteTime, assignment.startTime);
          }
        } else {
          sourceNode.start(absoluteTime);
        }

        scheduledAudioNodesRef.current.push(sourceNode);
      }
    });
  }, [audioContext, padAssignments, loadedSamples, stepToSeconds, lookaheadTime]);

  const playTrack = useCallback((
    events: (TrackEvent | FreeTrackEvent)[],
    mode: RecordingMode
  ) => {
    if (!audioContext || events.length === 0) return;

    const startTime = audioContext.currentTime;
    playbackStartTimeRef.current = startTime;
    setIsPlaying(true);
    setCurrentTime(0);

    scheduleEvents(events, mode, startTime);

    // Schedule the end of the track or loop
    const scheduleNextLoop = () => {
      if (!playbackStartTimeRef.current || !audioContext) return;

      const elapsed = audioContext.currentTime - playbackStartTimeRef.current;
      
      if (elapsed >= trackDurationSeconds) {
        if (loopEnabled) {
          // Start next loop
          const nextStartTime = audioContext.currentTime;
          playbackStartTimeRef.current = nextStartTime;
          scheduleEvents(events, mode, nextStartTime);
          
          // Schedule next check
          schedulerTimeoutRef.current = setTimeout(scheduleNextLoop, (trackDurationSeconds - lookaheadTime) * 1000);
        } else {
          stopTrack();
        }
      } else {
        // Check again before track end
        const timeUntilEnd = trackDurationSeconds - elapsed;
        schedulerTimeoutRef.current = setTimeout(scheduleNextLoop, Math.max(0, (timeUntilEnd - lookaheadTime) * 1000));
      }
    };

    // Start position updates
    positionUpdateIntervalRef.current = setInterval(() => {
      if (playbackStartTimeRef.current && audioContext) {
        const elapsed = audioContext.currentTime - playbackStartTimeRef.current;
        setCurrentTime(elapsed % trackDurationSeconds);
      }
    }, 50);

    // Schedule first loop check
    schedulerTimeoutRef.current = setTimeout(scheduleNextLoop, (trackDurationSeconds - lookaheadTime) * 1000);
  }, [audioContext, trackDurationSeconds, loopEnabled, scheduleEvents]);

  const stopTrack = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    playbackStartTimeRef.current = null;

    // Clear scheduler
    if (schedulerTimeoutRef.current) {
      clearTimeout(schedulerTimeoutRef.current);
      schedulerTimeoutRef.current = null;
    }

    // Clear position updates
    if (positionUpdateIntervalRef.current) {
      clearInterval(positionUpdateIntervalRef.current);
      positionUpdateIntervalRef.current = null;
    }

    // Stop all scheduled audio nodes
    scheduledAudioNodesRef.current.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Node might already be stopped
      }
    });
    scheduledAudioNodesRef.current = [];
  }, []);

  const toggleLoop = useCallback(() => {
    setLoopEnabled(prev => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTrack();
    };
  }, [stopTrack]);

  return {
    isPlaying,
    currentTime,
    loopEnabled,
    playTrack,
    stopTrack,
    toggleLoop,
    trackDurationSeconds
  };
};