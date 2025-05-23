"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSample, PadAssignments } from "@/lib/types";

const padCount = 16; // 4x4 grid

interface SamplePadsProps {
  audioContext: AudioContext | null;
  padAssignments: PadAssignments;
  loadedSamples: Record<string, AppSample>; // Map of sampleId to AppSample
  onPadClick: (padId: number) => void; // For selecting pad for assignment OR initiating play logic via parent
  playPad: (padId: number) => void;
  activePlayingPads: Record<number, boolean>; // To indicate which pads are currently playing
  selectedPadForAssignment: number | null; // To highlight pad selected for assignment
}

export default function SamplePads({
  padAssignments,
  loadedSamples,
  onPadClick, // This now signals an interaction that KlangroomLayout will interpret
  playPad,
  activePlayingPads,
  selectedPadForAssignment,
}: SamplePadsProps) {
  
  const handlePadInteraction = (padId: number) => {
    onPadClick(padId); // Inform parent: user clicked this pad. Parent decides if it's for assignment or to trigger play.
    // If not in an assignment flow (determined by parent state), the parent might call playPad, or playPad is called directly.
    // The current KlangroomLayout logic: onPadClick sets selectedPadForAssignment, OR MainSampleArea assigns if selection exists.
    // If pad has an assignment, playPad is the primary way to play it.
    // If there's no assignment and no selection in MainSampleArea, clicking pad could select it (handled by onPadClick in parent).
    // If there IS an assignment, we should prioritize playing it.
    if(padAssignments[padId]){
        playPad(padId);
    }
    // If no assignment, onPadClick informs parent, which might set it as target for new assignment.
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
          const isSelectedForAssignment = selectedPadForAssignment === padId;

          let padLabel = `Pad ${padId + 1}`;
          if (sample) {
            padLabel = sample.name.substring(0, 6) + (sample.name.length > 6 ? ".." : "");
            if (assignment?.startTime !== undefined) padLabel += " (C)"; // Indicate Chop
          }

          return (
            <Button
              key={padId}
              variant="outline"
              className={`aspect-square w-full h-full 
                         border-neutral-500 text-white p-1 
                         focus:ring-1 focus:ring-orange-400 focus:outline-none 
                         rounded-md transition-all duration-75 text-[10px] leading-tight break-all
                         ${isSelectedForAssignment ? 'ring-2 ring-yellow-400 bg-yellow-600' : 
                           (sample ? (assignment?.startTime !== undefined ? 'bg-purple-700 hover:bg-purple-600' : 'bg-sky-700 hover:bg-sky-600') : 'bg-neutral-600 hover:bg-neutral-500')}
                         ${isPlaying ? '!bg-orange-500 ring-2 !ring-orange-400 outline-none' : ''}`}
              onClick={() => handlePadInteraction(padId)}
              data-active={isPlaying}
            >
              {padLabel}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
} 