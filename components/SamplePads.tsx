"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSample, PadAssignments } from "@/lib/types";

const padCount = 16; // 4x4 grid

interface SamplePadsProps {
  audioContext: AudioContext | null;
  padAssignments: PadAssignments;
  loadedSamples: Record<string, AppSample>; // Map of sampleId to AppSample
  onPadClick: (padId: number) => void; // To notify parent for assignment logic
  playPad: (padId: number) => void;
  activePlayingPads: Record<number, boolean>; // To indicate which pads are currently playing
}

export default function SamplePads({
  padAssignments,
  loadedSamples,
  onPadClick,
  playPad,
  activePlayingPads,
}: SamplePadsProps) {
  const handlePadInteraction = (padId: number) => {
    onPadClick(padId); // Notify for assignment or other logic
    playPad(padId); // Attempt to play the pad
  };

  return (
    <Card className="bg-neutral-700 border-neutral-600 rounded-lg flex flex-col h-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-neutral-200 text-sm font-medium text-center">PADS</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow grid grid-cols-4 gap-2 p-3">
        {Array.from({ length: padCount }).map((_, padId) => {
          const assignment = padAssignments[padId];
          const sample = assignment ? loadedSamples[assignment.sampleId] : null;
          const isPlaying = activePlayingPads[padId] || false;

          return (
            <Button
              key={padId}
              variant="outline"
              className={`aspect-square w-full h-full 
                         border-neutral-500 text-white p-1 
                         focus:ring-1 focus:ring-orange-400 focus:outline-none 
                         rounded-md transition-all duration-75 text-xs
                         ${sample ? 'bg-sky-700 hover:bg-sky-600' : 'bg-neutral-600 hover:bg-neutral-500'}
                         ${isPlaying ? 'bg-orange-500 ring-1 ring-orange-400 outline-none' : ''}`}
              onClick={() => handlePadInteraction(padId)}
              data-active={isPlaying} // For potential external styling or testing
            >
              {sample ? sample.name.substring(0, 6) + ".." : `Pad ${padId + 1}`}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
} 