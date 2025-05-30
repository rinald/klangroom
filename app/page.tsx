"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SamplePads from "@/components/SamplePads";
import MainSampleArea from "@/components/MainSampleArea";
import TrackControls from "@/components/TrackControls";
import { useKeyboardControls } from "@/lib/hooks/useKeyboardControls";
import { useTrackRecording } from "@/lib/hooks/useTrackRecording";
import {
  DEFAULT_BPM,
  DEFAULT_QUANTIZATION,
  DEFAULT_TRACK_LENGTH_BARS,
} from "@/lib/constants";

import type { AppSample, PadAssignments, PadAssignment, PadMode } from "@/lib/types";

export default function MainPage() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [loadedSamples, setLoadedSamples] = useState<Record<string, AppSample>>(
    {},
  );
  const [padAssignments, setPadAssignments] = useState<PadAssignments>({});
  const [latestLoadedSampleId, setLatestLoadedSampleId] = useState<
    string | null
  >(null);
  const activeSourcesRef = useRef<
    Record<string, { node: AudioBufferSourceNode; contextStartTime: number }[]>
  >({});
  const keyPressStartTimes = useRef<Record<number, number>>({});
  const [activePlayingPads, setActivePlayingPads] = useState<
    Record<number, boolean>
  >({});
  const [selectedPadForAssignment, setSelectedPadForAssignment] = useState<
    number | null
  >(null);
  const [bpm, setBpm] = useState<number>(DEFAULT_BPM);
  const [trackLengthBars, setTrackLengthBars] = useState<number>(
    DEFAULT_TRACK_LENGTH_BARS,
  );
  const [quantizationValue, setQuantizationValue] =
    useState<number>(DEFAULT_QUANTIZATION);
  const [padMode, setPadMode] = useState<PadMode>('one-shot'); // 'one-shot': samples play to completion, 'gate': samples stop when key released

  useEffect(() => {
    const context = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  const playSampleById = useCallback(
    (
      sampleId: string,
      startTimeOffset?: number,
      duration?: number,
      onPlaybackEnd?: () => void,
      associatedPadId?: number,
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
    [audioContext, loadedSamples],
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
    [padAssignments],
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
    [],
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
    [],
  );

  const clearSelectedPadForAssignment = useCallback(() => {
    setSelectedPadForAssignment(null);
  }, []);

  const playPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId] && audioContext) {
      // Record the start time for this key press
      keyPressStartTimes.current[padId] = audioContext.currentTime;

      playSampleById(
        assignment.sampleId,
        assignment.startTime,
        assignment.duration,
        () => {
          // Clean up when sample ends naturally
          delete keyPressStartTimes.current[padId];
        },
        padId,
      );
    }
  };

  const stopPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId] && audioContext) {
      // Calculate the actual duration the key was held
      const startTime = keyPressStartTimes.current[padId];
      if (startTime !== undefined) {
        const actualDuration = audioContext.currentTime - startTime;

        // Record the event with the actual duration
        recordEvent(padId, actualDuration);

        // Clean up
        delete keyPressStartTimes.current[padId];
      }

      // Stop the playing sample
      stopSampleById(assignment.sampleId);
    }
  };

  // Track recording hook
  const {
    recordingMode,
    setRecordingMode,
    isRecording,
    startRecording,
    stopRecording,
    recordEvent,
    currentEvents,
    clearTrack,
    trackDurationSeconds,
  } = useTrackRecording({
    audioContext,
    bpm,
    quantization: quantizationValue,
    trackLengthBars,
    padAssignments,
    loadedSamples,
    playSample: playSampleById,
  });

  // In gate mode, samples stop when key is released. In one-shot mode, they play to completion.
  useKeyboardControls({ 
    onPadDown: playPad, 
    onPadUp: padMode === 'gate' ? stopPad : undefined 
  });

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
              audioContext={audioContext}
              bpm={bpm}
              setBpm={setBpm}
              padAssignments={padAssignments}
              loadedSamples={loadedSamples}
              trackLengthBars={trackLengthBars}
              setTrackLengthBars={setTrackLengthBars}
              quantizationValue={quantizationValue}
              isRecording={isRecording}
              setIsRecording={startRecording}
              stopRecording={stopRecording}
              recordingMode={recordingMode}
              setRecordingMode={setRecordingMode}
              trackDurationSeconds={trackDurationSeconds}
              currentEvents={currentEvents}
              clearTrack={clearTrack}
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
              padMode={padMode}
              setPadMode={setPadMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
