"use client"; // Required for useState and event handlers

import React, { useState, useRef } from "react";
import TransportControls from "./TransportControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSample } from "@/lib/types"; // Import shared type

interface MainSampleAreaProps {
  audioContext: AudioContext | null;
  onSampleLoad: (sample: AppSample) => void;
  // We might not need currentMasterSample here if we manage global playback differently
  // currentMasterSample: AppSample | null; 
  playSample: (sampleId: string) => void;
  stopSample: (sampleId: string) => void;
  isPlaying: (sampleId: string) => boolean;
  latestLoadedSample: AppSample | null; // To display name and control its playback
}

export default function MainSampleArea({
  audioContext,
  onSampleLoad,
  playSample,
  stopSample,
  isPlaying,
  latestLoadedSample,
}: MainSampleAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && audioContext) {
      const arrayBuffer = await file.arrayBuffer();
      audioContext.decodeAudioData(
        arrayBuffer,
        (audioBuffer) => {
          const newSample: AppSample = {
            id: Date.now().toString(), // Simple unique ID for now
            name: file.name,
            buffer: audioBuffer,
          };
          onSampleLoad(newSample);
          if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        },
        (error) => console.error("Error decoding audio data:", error)
      );
    }
  };

  const toggleMasterPlay = () => {
    if (latestLoadedSample) {
      if (isPlaying(latestLoadedSample.id)) {
        stopSample(latestLoadedSample.id);
      } else {
        playSample(latestLoadedSample.id);
      }
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <TransportControls /> {/* This will become more interactive later */}
      <Card className="flex-grow bg-neutral-700 border-neutral-600 rounded-lg flex flex-col">
        <CardHeader className="pb-2 pt-3 flex flex-row justify-between items-center">
          <CardTitle className="text-neutral-200 text-sm font-medium">SAMPLE CONTROL</CardTitle>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline" className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">
              <label htmlFor="file-upload" className="cursor-pointer">Load Sample</label>
            </Button>
            <Input ref={fileInputRef} id="file-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
            {latestLoadedSample && (
              <Button
                onClick={toggleMasterPlay}
                variant="outline"
                className={`text-xs h-8 ${isPlaying(latestLoadedSample.id) ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white border-none`}
              >
                {isPlaying(latestLoadedSample.id) ? "Stop" : "Play"} Loaded
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center p-3">
          <div className="w-full h-1/2 border border-dashed border-neutral-500 rounded-md flex items-center justify-center bg-neutral-800/30 mb-3">
            {latestLoadedSample ? (
              <p className="text-neutral-300 text-sm">Loaded: {latestLoadedSample.name}</p>
            ) : (
              <p className="text-neutral-500 text-sm">No sample loaded. Click \'Load Sample\' to begin.</p>
            )}
          </div>
          <div className="w-full h-1/2 border border-dashed border-neutral-500 rounded-md flex items-center justify-center bg-neutral-800/30">
            <p className="text-neutral-500 text-sm">Waveform display and chopping tools will appear here.</p>
            {/* This is where we will add waveform display and controls to select a pad for assignment */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 