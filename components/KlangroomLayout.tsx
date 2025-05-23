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

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  const playSampleById = useCallback((sampleId: string, associatedPadId?: number) => {
    if (!audioContext || !loadedSamples[sampleId]) return;

    const sample = loadedSamples[sampleId];
    const source = audioContext.createBufferSource();
    source.buffer = sample.buffer;
    source.connect(audioContext.destination);
    source.start(0);

    // Store this source
    if (!activeSourcesRef.current[sampleId]) {
      activeSourcesRef.current[sampleId] = [];
    }
    activeSourcesRef.current[sampleId].push(source);

    if (associatedPadId !== undefined) {
      setActivePlayingPads(prev => ({ ...prev, [associatedPadId]: true }));
    }
    
    source.onended = () => {
      activeSourcesRef.current[sampleId] = activeSourcesRef.current[sampleId]?.filter(s => s !== source);
      if (activeSourcesRef.current[sampleId]?.length === 0) {
        // If this was the last source for this sampleId, mark as not playing
        // This needs to be more nuanced if multiple pads can trigger the same sampleId
      }
      if (associatedPadId !== undefined) {
        setActivePlayingPads(prev => ({ ...prev, [associatedPadId]: false }));
      }
    };
  }, [audioContext, loadedSamples]);

  const stopSampleById = useCallback((sampleId: string) => {
    activeSourcesRef.current[sampleId]?.forEach(source => {
      try { source.stop(); source.disconnect(); } catch (e) { /* already stopped */ }
    });
    activeSourcesRef.current[sampleId] = []; // Clear out stopped sources
    // Update visual state for any pads associated with this sampleId
    Object.keys(padAssignments).forEach(padIdStr => {
        const padId = parseInt(padIdStr);
        if(padAssignments[padId]?.sampleId === sampleId) {
            setActivePlayingPads(prev => ({ ...prev, [padId]: false }));
        }
    });

  }, [padAssignments]); // Added padAssignments dependency

  const isSamplePlaying = useCallback((sampleId: string): boolean => {
    return (activeSourcesRef.current[sampleId]?.length || 0) > 0;
  }, []);

  const handleSampleLoad = (newSample: AppSample) => {
    setLoadedSamples(prev => ({ ...prev, [newSample.id]: newSample }));
    setLatestLoadedSampleId(newSample.id);
    // Stop any previously playing "latest" sample if it was playing directly
    if (latestLoadedSampleId && isSamplePlaying(latestLoadedSampleId)) {
        stopSampleById(latestLoadedSampleId);
    }
  };

  const handlePadClick = (padId: number) => {
    // Logic for assigning sample to pad:
    // If a sample is loaded (latestLoadedSampleId exists) and no sample is currently assigned to this pad,
    // or if we want to allow overriding, assign it.
    if (latestLoadedSampleId && !padAssignments[padId]) { // Simple assignment: assign if empty
      const newAssignment: PadAssignment = { sampleId: latestLoadedSampleId };
      setPadAssignments(prev => ({ ...prev, [padId]: newAssignment }));
    } else if (padAssignments[padId]) {
        // If pad already has assignment, the playPad function (called next in SamplePads) will handle it.
        // Or, implement logic here to clear/reassign.
    }
  };

  const playPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId] && audioContext) {
        // Check if this specific pad is already trying to play this sample (avoid retrigger issues rapidly)
        // For now, directly call playSampleById, it handles multiple sources for the same sampleId.
        playSampleById(assignment.sampleId, padId);
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
            playSample={playSampleById} // For the 'Play Loaded' button
            stopSample={stopSampleById}   // For the 'Stop Loaded' button
            isPlaying={isSamplePlaying} // For the 'Play/Stop Loaded' button state
            latestLoadedSample={latestSample}
          />
        )}
      </div>
      <div className="w-1/3 flex-none max-w-sm"> {/* Max width for pads area */}
        {audioContext && (
          <SamplePads
            audioContext={audioContext}
            padAssignments={padAssignments}
            loadedSamples={loadedSamples}
            onPadClick={handlePadClick}
            playPad={playPad}
            activePlayingPads={activePlayingPads}
          />
        )}
      </div>
    </div>
  );
} 