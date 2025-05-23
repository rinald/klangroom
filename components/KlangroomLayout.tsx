"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SamplePads from "./SamplePads";
import MainSampleArea from "./MainSampleArea";
import { AppSample, PadAssignments, PadAssignment } from "@/lib/types";

export default function KlangroomLayout() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [loadedSamples, setLoadedSamples] = useState<Record<string, AppSample>>({});
  const [padAssignments, setPadAssignments] = useState<PadAssignments>({});
  const [latestLoadedSampleId, setLatestLoadedSampleId] = useState<string | null>(null);
  // To track active audio sources for samples (master playback or pad playback)
  const activeSourcesRef = useRef<Record<string, AudioBufferSourceNode[]>>({});
  // To track which pad initiated a playback (for visual feedback on pads)
  const [activePlayingPads, setActivePlayingPads] = useState<Record<number, boolean>>({});
  const [selectedPadForAssignment, setSelectedPadForAssignment] = useState<number | null>(null);

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  const playSampleById = useCallback((sampleId: string, startTime?: number, duration?: number, associatedPadId?: number) => {
    if (!audioContext || !loadedSamples[sampleId]) return;

    const sample = loadedSamples[sampleId];
    const source = audioContext.createBufferSource();
    source.buffer = sample.buffer;
    source.connect(audioContext.destination);
    
    if (startTime !== undefined && duration !== undefined) {
      source.start(0, startTime, duration);
    } else {
      source.start(0);
    }

    activeSourcesRef.current[sampleId] = activeSourcesRef.current[sampleId] || [];
    activeSourcesRef.current[sampleId].push(source);

    if (associatedPadId !== undefined) {
      setActivePlayingPads(prev => ({ ...prev, [associatedPadId]: true }));
    }
    
    source.onended = () => {
      activeSourcesRef.current[sampleId] = activeSourcesRef.current[sampleId]?.filter(s => s !== source);
      if (associatedPadId !== undefined) {
        setActivePlayingPads(prev => ({ ...prev, [associatedPadId]: false }));
      }
    };
  }, [audioContext, loadedSamples]);

  const stopSampleById = useCallback((sampleId: string) => {
    activeSourcesRef.current[sampleId]?.forEach(source => {
      try { source.stop(); source.disconnect(); } catch (e) { /* already stopped or disconnected */ }
    });
    activeSourcesRef.current[sampleId] = [];
    Object.keys(padAssignments).forEach(padIdStr => {
      const padId = parseInt(padIdStr);
      if(padAssignments[padId]?.sampleId === sampleId) {
        setActivePlayingPads(prev => ({ ...prev, [padId]: false }));
      }
    });
  }, [padAssignments]);

  const isSamplePlaying = useCallback((sampleId: string): boolean => {
    return (activeSourcesRef.current[sampleId]?.length || 0) > 0;
  }, []);

  const handleSampleLoad = (newSample: AppSample) => {
    setLoadedSamples(prev => ({ ...prev, [newSample.id]: newSample }));
    setLatestLoadedSampleId(newSample.id);
    if (latestLoadedSampleId && isSamplePlaying(latestLoadedSampleId)) {
      stopSampleById(latestLoadedSampleId);
    }
    setSelectedPadForAssignment(null); // Clear any pending pad assignment
  };

  // This function is now for initiating an assignment process
  const handlePadClick = (padId: number) => {
    if (latestLoadedSampleId) { // If a sample is loaded and ready for chopping/assignment
        // If there's already a selection in MainSampleArea, assign it directly
        // This part will be handled by MainSampleArea calling assignChopToPad through its UI.
        // For now, clicking a pad while a sample is loaded means we *select this pad for future assignment*
        setSelectedPadForAssignment(padId);
    } else {
        // If no sample is loaded, or if we want pad to just play, this is handled by playPad
        setSelectedPadForAssignment(null); // Clicking pad without loaded sample clears selection mode
    }
  };

  const assignChopToPad = useCallback((padId: number, sampleId: string, startTime: number, duration: number) => {
    const newAssignment: PadAssignment = { sampleId, startTime, duration };
    setPadAssignments(prev => ({ ...prev, [padId]: newAssignment }));
    setSelectedPadForAssignment(null); // Clear selection mode after assignment
  }, []);

  const clearSelectedPadForAssignment = useCallback(() => {
    setSelectedPadForAssignment(null);
  }, []);

  const playPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId] && audioContext) {
      playSampleById(assignment.sampleId, assignment.startTime, assignment.duration, padId);
    }
  };

  const latestSample = latestLoadedSampleId ? loadedSamples[latestLoadedSampleId] : null;

  return (
    <div className="flex h-screen p-4 gap-4 bg-gray-900 text-neutral-200">
      <div className="flex-grow">
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
          />
        )}
      </div>
      <div className="w-1/3 flex-none max-w-sm">
        {audioContext && (
          <SamplePads
            audioContext={audioContext}
            padAssignments={padAssignments}
            loadedSamples={loadedSamples}
            onPadClick={handlePadClick} // Pad click now primarily for selecting pad or initiating play
            playPad={playPad} // Explicit function to play what's on the pad
            activePlayingPads={activePlayingPads}
          />
        )}
      </div>
    </div>
  );
} 