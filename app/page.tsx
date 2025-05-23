"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import SamplePads from "@/components/SamplePads";
import MainSampleArea from "@/components/MainSampleArea";
import TrackControls from "@/components/TrackControls";
import {
  AppSample,
  PadAssignments,
  PadAssignment,
  TrackLog,
  TrackEvent,
} from "@/lib/types";
import { useKeyboardControls } from "@/lib/hooks/useKeyboardControls";

const DEFAULT_BPM = 120;
const DEFAULT_TRACK_LENGTH_BARS = 4;
const DEFAULT_QUANTIZATION = 8; // 1/8th notes

export default function MainPage() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [loadedSamples, setLoadedSamples] = useState<Record<string, AppSample>>(
    {}
  );
  const [padAssignments, setPadAssignments] = useState<PadAssignments>({});
  const [latestLoadedSampleId, setLatestLoadedSampleId] = useState<
    string | null
  >(null);
  const activeSourcesRef = useRef<
    Record<string, { node: AudioBufferSourceNode; contextStartTime: number }[]>
  >({});
  const [activePlayingPads, setActivePlayingPads] = useState<
    Record<number, boolean>
  >({});
  const [selectedPadForAssignment, setSelectedPadForAssignment] = useState<
    number | null
  >(null);
  const [bpm, setBpm] = useState<number>(DEFAULT_BPM);
  const [trackLengthBars, setTrackLengthBars] = useState<number>(
    DEFAULT_TRACK_LENGTH_BARS
  );
  const [quantizationValue, setQuantizationValue] =
    useState<number>(DEFAULT_QUANTIZATION);
  const [trackLog, setTrackLog] = useState<TrackLog>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextMetronomeTimeRef = useRef<number>(0);
  const trackStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const context = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      trackStartTimeRef.current = null;
    }
  }, [isRecording]);

  // Metronome scheduling logic
  useEffect(() => {
    if (isMetronomeActive && audioContext) {
      const scheduleMetronomeClick = () => {
        if (!isMetronomeActive || !audioContext) return; // Double check, in case state changed

        // Synthesize a simple click sound
        const clickOsc = audioContext.createOscillator();
        const clickGain = audioContext.createGain();
        clickOsc.type = "triangle"; // A short triangle wave can sound like a click
        clickOsc.frequency.setValueAtTime(880, audioContext.currentTime); // A4 pitch
        clickGain.gain.setValueAtTime(1, audioContext.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 0.05
        );
        clickOsc.connect(clickGain).connect(audioContext.destination);

        clickOsc.start(nextMetronomeTimeRef.current);
        clickOsc.stop(nextMetronomeTimeRef.current + 0.05);

        // Calculate next click time
        const secondsPerBeat = 60 / bpm;
        nextMetronomeTimeRef.current += secondsPerBeat;

        // Schedule the next one
        const lookahead = 0.1; // 100ms (how far ahead to schedule audio)
        if (
          nextMetronomeTimeRef.current <
          audioContext.currentTime + lookahead + secondsPerBeat
        ) {
          // Check if we need to schedule more
          // Schedule the next call to this function shortly before the next beat
          if (metronomeIntervalRef.current)
            clearInterval(metronomeIntervalRef.current);
          metronomeIntervalRef.current = setTimeout(
            scheduleMetronomeClick,
            (nextMetronomeTimeRef.current -
              audioContext.currentTime -
              lookahead) *
              1000
          );
        }
      };

      nextMetronomeTimeRef.current = audioContext.currentTime; // Start immediately on the next available tick
      scheduleMetronomeClick(); // Start the scheduler
    } else {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      nextMetronomeTimeRef.current = 0;
    }

    return () => {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
    };
  }, [isMetronomeActive, audioContext, bpm]);

  const playSampleById = useCallback(
    (
      sampleId: string,
      startTimeOffset?: number,
      duration?: number,
      onPlaybackEnd?: () => void,
      associatedPadId?: number
    ): AudioBufferSourceNode | undefined => {
      if (!audioContext || !loadedSamples[sampleId]) return undefined;

      const sample = loadedSamples[sampleId];
      const source = audioContext.createBufferSource();
      source.buffer = sample.buffer;
      source.connect(audioContext.destination);

      const actualStartTime = audioContext.currentTime;

      if (startTimeOffset !== undefined && duration !== undefined) {
        source.start(0, startTimeOffset, duration);
      } else if (startTimeOffset !== undefined) {
        source.start(0, startTimeOffset);
      } else {
        source.start(0);
      }

      activeSourcesRef.current[sampleId] =
        activeSourcesRef.current[sampleId] || [];
      activeSourcesRef.current[sampleId].push({
        node: source,
        contextStartTime: actualStartTime,
      });

      if (associatedPadId !== undefined) {
        setActivePlayingPads((prev) => ({ ...prev, [associatedPadId]: true }));
      }

      source.onended = () => {
        activeSourcesRef.current[sampleId] = activeSourcesRef.current[
          sampleId
        ]?.filter((s) => s.node !== source);
        if (associatedPadId !== undefined) {
          setActivePlayingPads((prev) => ({
            ...prev,
            [associatedPadId]: false,
          }));
        }
        if (onPlaybackEnd) {
          onPlaybackEnd();
        }
        // No specific logic needed here for latestLoadedSampleId as MainSampleArea manages its play/stop state and visual feedback
      };
      return source;
    },
    [audioContext, loadedSamples]
  ); // Removed latestLoadedSampleId from dependencies as it's not directly used for source.onended logic anymore

  const stopSampleById = useCallback(
    (sampleId: string) => {
      activeSourcesRef.current[sampleId]?.forEach((sourceInfo) => {
        try {
          sourceInfo.node.stop();
          sourceInfo.node.disconnect();
        } catch (e) {}
      });
      activeSourcesRef.current[sampleId] = [];
      Object.keys(padAssignments).forEach((padIdStr) => {
        const padId = parseInt(padIdStr);
        if (padAssignments[padId]?.sampleId === sampleId) {
          setActivePlayingPads((prev) => ({ ...prev, [padId]: false }));
        }
      });
    },
    [padAssignments]
  );

  const isSamplePlaying = useCallback((sampleId: string): boolean => {
    return (activeSourcesRef.current[sampleId]?.length || 0) > 0;
  }, []);

  const getSamplePlaybackStartTime = useCallback(
    (sampleId: string): number | null => {
      const sources = activeSourcesRef.current[sampleId];
      if (sources && sources.length > 0) {
        // For the playhead of the main sample area, we are interested in the most recent (or only) playback instance
        // If multiple are playing (e.g. from rapid re-triggering before stop fully processes), the last one started is likely most relevant for playhead display
        return sources[sources.length - 1].contextStartTime;
      }
      return null;
    },
    []
  );

  const handleSampleLoad = (newSample: AppSample) => {
    if (latestLoadedSampleId && isSamplePlaying(latestLoadedSampleId)) {
      stopSampleById(latestLoadedSampleId);
    }
    setLoadedSamples((prev) => ({ ...prev, [newSample.id]: newSample }));
    setLatestLoadedSampleId(newSample.id);
    setSelectedPadForAssignment(null);
  };

  const handlePadClick = (padId: number) => {
    if (latestLoadedSampleId) {
      setSelectedPadForAssignment(padId);
    } else {
      setSelectedPadForAssignment(null);
    }
  };

  const assignChopToPad = useCallback(
    (padId: number, sampleId: string, startTime: number, duration: number) => {
      const newAssignment: PadAssignment = { sampleId, startTime, duration };
      setPadAssignments((prev) => ({ ...prev, [padId]: newAssignment }));
      setSelectedPadForAssignment(null);
    },
    []
  );

  const clearSelectedPadForAssignment = useCallback(() => {
    setSelectedPadForAssignment(null);
  }, []);

  const recordTrackEvent = useCallback(
    (padId: number, eventDurationSeconds: number) => {
      if (!isRecording || !audioContext) return;

      if (trackStartTimeRef.current === null) {
        trackStartTimeRef.current = audioContext.currentTime;
        // Optionally clear trackLog here if new recording should always start fresh
        // setTrackLog([]);
      }

      const timeSinceTrackStart = Math.max(
        0,
        audioContext.currentTime - trackStartTimeRef.current
      );

      const beatsPerBar = 4; // Common time signature
      const totalBeatsInTrack = trackLengthBars * beatsPerBar;
      const totalSecondsInTrack = (totalBeatsInTrack / bpm) * 60;

      // Stop recording if the current time is beyond the track length
      if (timeSinceTrackStart >= totalSecondsInTrack) {
        console.log("Track length exceeded, stopping recording.");
        setIsRecording(false);
        return;
      }

      const beatsPerSecond = bpm / 60;
      const secondsPerBeat = 1 / beatsPerSecond;
      const stepsPerBeat = quantizationValue / (beatsPerBar / 4); // e.g. quantization 8 (1/8th notes), 4 beats -> 8 / (4/4) = 8 steps per beat (incorrect, should be 2 for 1/8th)
      // Corrected: stepsPerBeat is effectively quantizationValue / beatsPerBar if quantization is per bar.
      // Or more simply: secondsPerQuantizedStep directly
      const secondsPerQuantizedStep = 60 / bpm / (quantizationValue / 4); // (secondsPerBeat) / (stepsPerBeat / beatsPerBar)
      // Example: 120 BPM (0.5s per beat). Quantization 8 (1/8th notes) means 2 steps per beat. So 0.25s per step.
      // (60/120) / (8/4) = 0.5 / 2 = 0.25s.

      const quantizedStartTimeStep = Math.round(
        timeSinceTrackStart / secondsPerQuantizedStep
      );
      const quantizedDurationSteps = Math.max(
        1,
        Math.round(eventDurationSeconds / secondsPerQuantizedStep)
      );

      // Check if the event *starts* beyond the track length in quantized steps
      const totalQuantizedStepsInTrack = trackLengthBars * quantizationValue; // If quantizationValue is steps per bar
      if (quantizedStartTimeStep >= totalQuantizedStepsInTrack) {
        console.log("Event starts beyond track length, stopping recording.");
        setIsRecording(false);
        return;
      }

      const newEvent: TrackEvent = {
        padId,
        startTime: quantizedStartTimeStep,
        // Potentially cap duration so it doesn't exceed track length
        duration: Math.min(
          quantizedDurationSteps,
          totalQuantizedStepsInTrack - quantizedStartTimeStep
        ),
      };

      console.log("New Track Event (recorded):", newEvent);
      setTrackLog((prevLog) => [...prevLog, newEvent]);
    },
    [
      isRecording,
      audioContext,
      bpm,
      quantizationValue,
      trackLengthBars,
      setIsRecording /*, setTrackLog*/,
    ]
  );

  const playPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId] && audioContext) {
      const sampleDuration = loadedSamples[assignment.sampleId].buffer.duration;
      const chopDuration = assignment.duration ?? sampleDuration;
      recordTrackEvent(padId, chopDuration);

      playSampleById(
        assignment.sampleId,
        assignment.startTime,
        assignment.duration,
        () => {
          /* Pad specific on-end logic can go here if needed */
        },
        padId
      );
    }
  };

  const stopPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId]) {
      // Find the specific source node if multiple instances of the same sample can be played by different pads
      // For now, we assume one-to-one mapping or stop all instances of the sampleId linked to this pad.
      stopSampleById(assignment.sampleId);
    }
  };

  useKeyboardControls({ onPadDown: playPad, onPadUp: stopPad });

  const latestSample = latestLoadedSampleId
    ? loadedSamples[latestLoadedSampleId]
    : null;

  return (
    <div className="flex flex-col h-screen p-4 gap-4 bg-gray-900 text-neutral-200">
      {/* Top: Sample Control Area - takes initial height, doesn't grow or shrink as much */}
      <div className="flex-shrink-0">
        {audioContext && (
          <MainSampleArea
            audioContext={audioContext}
            onSampleLoad={handleSampleLoad}
            playSample={playSampleById}
            stopSample={stopSampleById}
            isPlaying={isSamplePlaying}
            latestLoadedSample={latestSample}
            assignChopToPad={assignChopToPad}
            selectedPadForAssignment={selectedPadForAssignment}
            clearSelectedPadForAssignment={clearSelectedPadForAssignment}
            getSamplePlaybackStartTime={getSamplePlaybackStartTime}
          />
        )}
      </div>

      {/* Bottom: Track Controls and Pad Bank - takes remaining space and arranged in a row */}
      <div className="flex-grow flex flex-row gap-4 overflow-hidden">
        {/* Left: Track Controls - takes most of the space in this row */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {audioContext && (
            <TrackControls
              trackLog={trackLog}
              bpm={bpm}
              setBpm={setBpm}
              trackLengthBars={trackLengthBars}
              setTrackLengthBars={setTrackLengthBars}
              quantizationValue={quantizationValue}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              isMetronomeActive={isMetronomeActive}
              setIsMetronomeActive={setIsMetronomeActive}
            />
          )}
        </div>

        {/* Right: Pad Bank - fixed width or flex-shrink as needed */}
        <div className="w-1/3 flex flex-col justify-center items-center flex-none max-w-sm">
          {audioContext && (
            <SamplePads
              audioContext={audioContext}
              padAssignments={padAssignments}
              loadedSamples={loadedSamples}
              onPadClick={handlePadClick}
              playPad={playPad}
              activePlayingPads={activePlayingPads}
              selectedPadForAssignment={selectedPadForAssignment}
            />
          )}
        </div>
      </div>
    </div>
  );
}
