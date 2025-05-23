"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import SamplePads from "@/components/SamplePads";
import MainSampleArea from "@/components/MainSampleArea";
import { AppSample, PadAssignments, PadAssignment } from "@/lib/types";

export default function MainPage() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [loadedSamples, setLoadedSamples] = useState<Record<string, AppSample>>({});
  const [padAssignments, setPadAssignments] = useState<PadAssignments>({});
  const [latestLoadedSampleId, setLatestLoadedSampleId] = useState<string | null>(null);
  const activeSourcesRef = useRef<Record<string, {node: AudioBufferSourceNode, contextStartTime: number}[]>>({}); 
  const [activePlayingPads, setActivePlayingPads] = useState<Record<number, boolean>>({});
  const [selectedPadForAssignment, setSelectedPadForAssignment] = useState<number | null>(null);

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(context);
    return () => { context.close(); };
  }, []);

  const playSampleById = useCallback((sampleId: string, startTimeOffset?: number, duration?: number, onPlaybackEnd?: () => void, associatedPadId?: number): AudioBufferSourceNode | undefined => {
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

    activeSourcesRef.current[sampleId] = activeSourcesRef.current[sampleId] || [];
    activeSourcesRef.current[sampleId].push({node: source, contextStartTime: actualStartTime });

    if (associatedPadId !== undefined) {
      setActivePlayingPads(prev => ({ ...prev, [associatedPadId]: true }));
    }
    
    source.onended = () => {
      activeSourcesRef.current[sampleId] = activeSourcesRef.current[sampleId]?.filter(s => s.node !== source);
      if (associatedPadId !== undefined) {
        setActivePlayingPads(prev => ({ ...prev, [associatedPadId]: false }));
      }
      if (onPlaybackEnd) {
        onPlaybackEnd();
      }
      // No specific logic needed here for latestLoadedSampleId as MainSampleArea manages its play/stop state and visual feedback
    };
    return source; 
  }, [audioContext, loadedSamples]); // Removed latestLoadedSampleId from dependencies as it's not directly used for source.onended logic anymore

  const stopSampleById = useCallback((sampleId: string) => {
    activeSourcesRef.current[sampleId]?.forEach(sourceInfo => {
      try { sourceInfo.node.stop(); sourceInfo.node.disconnect(); } catch (e) {}
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

  const getSamplePlaybackStartTime = useCallback((sampleId: string): number | null => {
    const sources = activeSourcesRef.current[sampleId];
    if (sources && sources.length > 0) {
      // For the playhead of the main sample area, we are interested in the most recent (or only) playback instance
      // If multiple are playing (e.g. from rapid re-triggering before stop fully processes), the last one started is likely most relevant for playhead display
      return sources[sources.length - 1].contextStartTime; 
    }
    return null;
  }, []);

  const handleSampleLoad = (newSample: AppSample) => {
    if (latestLoadedSampleId && isSamplePlaying(latestLoadedSampleId)) {
      stopSampleById(latestLoadedSampleId);
    }
    setLoadedSamples(prev => ({ ...prev, [newSample.id]: newSample }));
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

  const assignChopToPad = useCallback((padId: number, sampleId: string, startTime: number, duration: number) => {
    const newAssignment: PadAssignment = { sampleId, startTime, duration };
    setPadAssignments(prev => ({ ...prev, [padId]: newAssignment }));
    setSelectedPadForAssignment(null); 
  }, []);

  const clearSelectedPadForAssignment = useCallback(() => {
    setSelectedPadForAssignment(null);
  }, []);

  const playPad = (padId: number) => {
    const assignment = padAssignments[padId];
    if (assignment && loadedSamples[assignment.sampleId] && audioContext) {
      playSampleById(assignment.sampleId, assignment.startTime, assignment.duration, 
        () => { /* Pad specific on-end logic can go here if needed */ }, 
        padId // associatedPadId is the last argument
      );
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
            getSamplePlaybackStartTime={getSamplePlaybackStartTime} 
          />
        )}
      </div>
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
  );
} 

