import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { keyMap } from "@/lib/hooks/useKeyboardControls";
import { AppSample, PadAssignments, PadMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const padCount = 16; // 4x4 grid

interface SamplePadsProps {
  padAssignments: PadAssignments;
  loadedSamples: Record<string, AppSample>; // Map of sampleId to AppSample
  onPadClick: (padId: number) => void; // For selecting pad for assignment OR initiating play logic via parent
  playPad: (padId: number) => void;
  activePlayingPads: Record<number, boolean>; // To indicate which pads are currently playing
  selectedPadForAssignment: number | null; // To highlight pad selected for assignment
  padMode: PadMode;
  setPadMode: (mode: PadMode) => void;
}

export default function SamplePads({
  padAssignments,
  loadedSamples,
  onPadClick,
  playPad,
  activePlayingPads,
  selectedPadForAssignment,
  padMode,
  setPadMode,
}: SamplePadsProps) {
  const handlePadInteraction = (padId: number) => {
    onPadClick(padId);

    if (padAssignments[padId]) {
      playPad(padId);
    }
  };

  return (
    <Card className="border-neutral-600 rounded-lg flex flex-col w-full h-full">
      <CardHeader className="py-2">
        <div className="flex justify-center gap-1 mt-1">
          <Button
            variant={padMode === "one-shot" ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs px-2 py-1 h-6",
              padMode === "one-shot"
                ? "bg-sky-800 hover:bg-sky-900 text-white border-orange-400"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-600",
            )}
            onClick={() => setPadMode("one-shot")}
          >
            ONE-SHOT
          </Button>
          <Button
            variant={padMode === "gate" ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs px-2 py-1 h-6",
              padMode === "gate"
                ? "bg-sky-800 hover:bg-sky-900 text-white border-orange-400"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-600",
            )}
            onClick={() => setPadMode("gate")}
          >
            GATE
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-4 gap-2 p-2 my-auto">
        {Array.from({ length: padCount }).map((_, padId) => {
          const assignment = padAssignments[padId];
          const sample = assignment ? loadedSamples[assignment.sampleId] : null;
          const isPlaying = activePlayingPads[padId] || false;
          const isSelectedForAssignment = selectedPadForAssignment === padId;

          return (
            <Button
              key={padId}
              variant="outline"
              className={cn(
                "aspect-square w-full h-full p-1",
                "focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-700 focus:ring-orange-400 focus:outline-none",
                "rounded-md transition-all duration-100 text-[9px] leading-tight break-words",
                "flex items-center justify-center",
                "text-lg",
                isSelectedForAssignment && "bg-secondary ring-2",
                !isSelectedForAssignment &&
                  sample &&
                  assignment?.startTime !== undefined &&
                  "bg-sky-300 !text-neutral-800 hover:bg-sky-300/90",
                !isSelectedForAssignment &&
                  sample &&
                  assignment?.startTime === undefined &&
                  "bg-sky-600 border-sky-500 text-neutral-100",
                !isSelectedForAssignment &&
                  !sample &&
                  "bg-secondary border-neutral-600 text-neutral-400",
                isPlaying &&
                  "!bg-red-400 !text-white ring-2 ring-red-400 ring-offset-2 ring-offset-neutral-700",
              )}
              onClick={() => handlePadInteraction(padId)}
              data-active={isPlaying}
            >
              {Object.keys(keyMap)[padId].toUpperCase()}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
