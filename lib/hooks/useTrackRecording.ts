import { useState, useRef, useCallback } from "react";

import useWorkspaceStore from "@/lib/stores/workspace";

import type { TrackEvent, FreeTrackEvent, RecordingMode } from "@/lib/types";

export const useTrackRecording = () => {
  const audioContext = useWorkspaceStore((state) => state.audioContext);
  const bpm = useWorkspaceStore((state) => state.bpm);
  const trackLength = useWorkspaceStore((state) => state.trackLength);
  const quantization = useWorkspaceStore((state) => state.quantization);

  // Recording state
  const [recordingMode, setRecordingMode] =
    useState<RecordingMode>("quantized");
  const [isRecording, setIsRecording] = useState(false);
  const [quantizedEvents, setQuantizedEvents] = useState<TrackEvent[]>([]);
  const [freeEvents, setFreeEvents] = useState<FreeTrackEvent[]>([]);

  // Refs for timing
  const recordingStartTimeRef = useRef<number | null>(null);

  // Calculate track duration in seconds
  const trackDurationSeconds = (trackLength * 4 * 60) / bpm;

  // Quantization helpers
  const getQuantizedTime = useCallback(
    (timeSeconds: number) => {
      const beatsPerSecond = bpm / 60;
      const stepsPerBeat = quantization / 4; // e.g., 16th notes = 4 steps per beat
      const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
      return Math.round(timeSeconds / secondsPerStep);
    },
    [bpm, quantization],
  );

  const stepToSeconds = useCallback(
    (step: number) => {
      const beatsPerSecond = bpm / 60;
      const stepsPerBeat = quantization / 4;
      const secondsPerStep = 1 / (beatsPerSecond * stepsPerBeat);
      return step * secondsPerStep;
    },
    [bpm, quantization],
  );

  // Recording functions
  const startRecording = useCallback(() => {
    if (!audioContext) return;

    setIsRecording(true);
    recordingStartTimeRef.current = audioContext.currentTime;

    // Clear previous recordings based on mode
    if (recordingMode === "quantized") {
      setQuantizedEvents([]);
    } else {
      setFreeEvents([]);
    }
  }, [audioContext, recordingMode]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    recordingStartTimeRef.current = null;
  }, []);

  const recordEvent = useCallback(
    (padId: number, duration: number) => {
      if (
        !isRecording ||
        !audioContext ||
        recordingStartTimeRef.current === null
      ) {
        return;
      }

      const currentTime = audioContext.currentTime;
      const timeFromStart = currentTime - recordingStartTimeRef.current;

      // Don't record if beyond track length
      if (timeFromStart >= trackDurationSeconds) {
        console.log("Event beyond track length, stopping recording");
        stopRecording();
        return;
      }

      if (recordingMode === "quantized") {
        const quantizedStart = getQuantizedTime(timeFromStart);
        const quantizedDuration = Math.max(1, getQuantizedTime(duration));

        const newEvent: TrackEvent = {
          padId,
          startTime: quantizedStart,
          duration: quantizedDuration,
        };

        setQuantizedEvents((prev) => [...prev, newEvent]);
      } else {
        // Free recording - exact timing
        const newEvent: FreeTrackEvent = {
          padId,
          startTime: timeFromStart,
          duration,
          audioContextTime: currentTime,
        };

        setFreeEvents((prev) => [...prev, newEvent]);
      }
    },
    [
      isRecording,
      audioContext,
      recordingMode,
      trackDurationSeconds,
      getQuantizedTime,
      stopRecording,
    ],
  );

  const clearTrack = useCallback(() => {
    setQuantizedEvents([]);
    setFreeEvents([]);
  }, []);

  // Helper to get current events based on mode
  const getCurrentEvents = useCallback(() => {
    return recordingMode === "quantized" ? quantizedEvents : freeEvents;
  }, [recordingMode, quantizedEvents, freeEvents]);

  return {
    // Recording state
    recordingMode,
    setRecordingMode,
    isRecording,

    // Recording controls
    startRecording,
    stopRecording,
    recordEvent,

    // Events data
    quantizedEvents,
    freeEvents,
    currentEvents: getCurrentEvents(),

    // Utilities
    clearTrack,
    trackDurationSeconds,
    stepToSeconds,
    getQuantizedTime,
  };
};
