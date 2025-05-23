"use client"; // Required for useState and event handlers

import React, { useState, useRef, useEffect, useCallback } from "react";
import TransportControls from "./TransportControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSample } from "@/lib/types"; // Import shared type
import { drawWaveform } from "@/lib/utils"; // Import the waveform utility

interface MainSampleAreaProps {
  audioContext: AudioContext | null;
  onSampleLoad: (sample: AppSample, file?: File) => void; // Added File for potential re-use
  // We might not need currentMasterSample here if we manage global playback differently
  // currentMasterSample: AppSample | null; 
  playSample: (sampleId: string, startTime?: number, duration?: number) => void;
  stopSample: (sampleId: string) => void;
  isPlaying: (sampleId: string) => boolean;
  latestLoadedSample: AppSample | null; // To display name and control its playback
  assignChopToPad: (padId: number, sampleId: string, startTime: number, duration: number) => void;
  selectedPadForAssignment: number | null;
  clearSelectedPadForAssignment: () => void;
}

export default function MainSampleArea({
  audioContext,
  onSampleLoad,
  playSample,
  stopSample,
  isPlaying,
  latestLoadedSample,
  assignChopToPad,
  selectedPadForAssignment,
  clearSelectedPadForAssignment,
}: MainSampleAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false); // Renamed from isDragging for clarity
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const dragStartPercentRef = useRef<number | null>(null); // Using ref for drag start, doesn't need to trigger re-render

  // Redraw waveform when sample or selection changes
  useEffect(() => {
    if (waveformCanvasRef.current && latestLoadedSample) {
      drawWaveform(waveformCanvasRef.current, latestLoadedSample.buffer, selection ?? undefined);
    } else if (waveformCanvasRef.current) {
      drawWaveform(waveformCanvasRef.current, null, undefined);
    }
  }, [latestLoadedSample, selection]); // waveformCanvasRef shouldn't be a dependency here

  const processFile = useCallback(async (file: File) => {
    if (audioContext) {
      const arrayBuffer = await file.arrayBuffer();
      audioContext.decodeAudioData(
        arrayBuffer,
        (audioBuffer) => {
          const newSample: AppSample = {
            id: Date.now().toString(),
            name: file.name,
            buffer: audioBuffer,
          };
          onSampleLoad(newSample, file);
          setSelection(null); // Reset selection on new sample load
        },
        (error) => console.error("Error decoding audio data:", error)
      );
    }
  }, [audioContext, onSampleLoad]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith("audio/")) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const toggleMasterPlay = () => {
    if (latestLoadedSample) {
      if (isPlaying(latestLoadedSample.id)) {
        stopSample(latestLoadedSample.id);
      } else {
        // Play full sample or selected region if available?
        // For now, plays full sample or selected chop based on context
        if (selection && selection.end > selection.start) {
            const duration = latestLoadedSample.buffer.duration;
            const startTime = selection.start * duration;
            const chopDuration = (selection.end - selection.start) * duration;
            playSample(latestLoadedSample.id, startTime, chopDuration);
        } else {
            playSample(latestLoadedSample.id);
        }
      }
    }
  };

  // Waveform interaction
  const getMousePositionPercent = useCallback((clientX: number): number => {
    if (!waveformCanvasRef.current) return 0;
    const rect = waveformCanvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!latestLoadedSample) return;
    event.preventDefault();
    const startPercent = getMousePositionPercent(event.clientX);
    setIsSelecting(true);
    dragStartPercentRef.current = startPercent;
    setSelection({ start: startPercent, end: startPercent });
  };

  // Define handleAssignToSelectedPad first
  const handleAssignToSelectedPad = useCallback(() => {
    if (latestLoadedSample && selection && selection.end > selection.start && selectedPadForAssignment !== null) {
        const duration = latestLoadedSample.buffer.duration;
        const startTime = selection.start * duration;
        const chopDuration = (selection.end - selection.start) * duration;
        assignChopToPad(selectedPadForAssignment, latestLoadedSample.id, startTime, chopDuration);
        setSelection(null); // Optionally clear selection after assignment
        clearSelectedPadForAssignment(); // Clear the selected pad
    }
  }, [latestLoadedSample, selection, selectedPadForAssignment, assignChopToPad, clearSelectedPadForAssignment]);

  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    if (!isSelecting || dragStartPercentRef.current === null || !latestLoadedSample) return;
    const currentPercent = getMousePositionPercent(event.clientX);
    setSelection({
      start: Math.min(dragStartPercentRef.current, currentPercent),
      end: Math.max(dragStartPercentRef.current, currentPercent),
    });
  }, [isSelecting, latestLoadedSample, getMousePositionPercent]);

  const handleGlobalMouseUp = useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);
    dragStartPercentRef.current = null;
    if (selectedPadForAssignment !== null && selection && selection.end > selection.start && latestLoadedSample) {
      handleAssignToSelectedPad();
    }
  }, [isSelecting, selectedPadForAssignment, selection, latestLoadedSample, handleAssignToSelectedPad]);
  
  // Effect for global mouse listeners
  useEffect(() => {
    if (isSelecting) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    } else {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, handleGlobalMouseMove, handleGlobalMouseUp]);

  return (
    <div className="flex flex-col space-y-4 h-full">
      <TransportControls /> {/* This will become more interactive later */}
      <Card className="flex-grow bg-neutral-700 border-neutral-600 rounded-lg flex flex-col">
        <CardHeader className="pb-2 pt-3 flex flex-row justify-between items-center">
          <CardTitle className="text-neutral-200 text-sm font-medium">SAMPLE CONTROL</CardTitle>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline" className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8">
              <label htmlFor="file-upload" className="cursor-pointer">Load File</label>
            </Button>
            <Input ref={fileInputRef} id="file-upload" type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
            {latestLoadedSample && (
              <Button
                onClick={toggleMasterPlay}
                variant="outline"
                className={`text-xs h-8 ${isPlaying(latestLoadedSample.id) ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white border-none`}
              >
                {isPlaying(latestLoadedSample.id) ? "Stop" : "Play"} {selection && selection.end > selection.start ? "Chop" : "Sample"}
              </Button>
            )}
            {latestLoadedSample && selection && selection.end > selection.start && selectedPadForAssignment === null && (
                 <p className="text-xs text-orange-400">Click a pad to assign selection</p>
            )}
            {latestLoadedSample && selection && selection.end > selection.start && selectedPadForAssignment !== null && (
                <Button onClick={handleAssignToSelectedPad} className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8">
                    Assign to Pad {selectedPadForAssignment + 1}
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center p-3 space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="w-full h-1/4 border border-dashed border-neutral-500 rounded-md flex items-center justify-center bg-neutral-800/30 cursor-pointer hover:border-orange-400 transition-colors"
          >
            {latestLoadedSample ? (
              <p className="text-neutral-300 text-sm px-2 text-center">Loaded: {latestLoadedSample.name}</p>
            ) : (
              <p className="text-neutral-400 text-sm">Drag & Drop Audio File Here or Click \"Load File\"</p>
            )}
          </div>
          <div className="w-full h-3/4 bg-neutral-800/50 rounded-md relative overflow-hidden border border-neutral-600">
            <canvas
              ref={waveformCanvasRef}
              width={600} // Initial width, consider making responsive
              height={150} // Initial height
              className="w-full h-full cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 