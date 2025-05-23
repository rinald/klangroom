import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlayIcon,
  PauseIcon,
  SquareIcon as StopIcon,
  RadioIcon as MetronomeIcon,
  DiscIcon as RecordIcon,
} from "lucide-react";
import { TrackLog } from "@/lib/types";

interface TrackControlsProps {
  trackLog: TrackLog;
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  trackLengthBars: number;
  setTrackLengthBars: React.Dispatch<React.SetStateAction<number>>;
  quantizationValue: number;
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  isMetronomeActive: boolean;
  setIsMetronomeActive: React.Dispatch<React.SetStateAction<boolean>>;
  // Metronome props will be added later
}

export default function TrackControls({
  trackLog,
  bpm,
  setBpm,
  trackLengthBars,
  setTrackLengthBars,
  quantizationValue,
  isRecording,
  setIsRecording,
  isMetronomeActive,
  setIsMetronomeActive,
}: TrackControlsProps) {
  const stepsPerBar = quantizationValue;
  const totalSteps = trackLengthBars * stepsPerBar;
  const numPads = 16;
  const rowHeight = 24; // px
  const stepWidth = 20; // px

  const handleRecordClick = () => {
    setIsRecording(!isRecording);
  };

  const handleMetronomeClick = () => {
    setIsMetronomeActive(!isMetronomeActive);
  };

  return (
    <Card className="bg-neutral-700 border-neutral-600 rounded-lg flex flex-col h-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-neutral-200 text-sm font-medium">
          TRACK CONTROLS
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-2 p-3 overflow-hidden">
        {/* Track Info & Controls */}
        <div className="flex items-center justify-between space-x-2 pb-2 border-b border-neutral-600 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">BPM:</span>
            <Input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 bg-neutral-800 border-neutral-600 text-neutral-200 p-1 rounded h-8 text-sm text-center"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">Length (Bars):</span>
            <Input
              type="number"
              value={trackLengthBars}
              onChange={(e) => setTrackLengthBars(Number(e.target.value))}
              className="w-12 bg-neutral-800 border-neutral-600 text-neutral-200 p-1 rounded h-8 text-sm text-center"
            />
          </div>
          <div className="flex items-center space-x-1">
            <Button
              onClick={handleMetronomeClick}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                isMetronomeActive ? "text-orange-400" : "text-neutral-300"
              } hover:bg-neutral-600`}
            >
              <MetronomeIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleRecordClick}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                isRecording ? "text-red-500 animate-pulse" : "text-neutral-300"
              } hover:bg-neutral-600`}
            >
              <RecordIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Track Visualization Area - make it take available space and scroll if needed */}
        <div className="flex-grow bg-neutral-800 rounded-md border border-neutral-600 overflow-auto relative">
          {/* Grid Lines - Vertical (time steps) - ensure they cover full height */}
          {Array.from({ length: totalSteps + 1 }).map((_, stepIndex) => (
            <div
              key={`vline-${stepIndex}`}
              className="absolute top-0 bottom-0 border-l border-neutral-700/50"
              style={{ left: `${stepIndex * stepWidth}px`, width: "1px" }}
            ></div>
          ))}
          {/* Grid Lines - Horizontal (pads) - ensure they cover full width */}
          {Array.from({ length: numPads + 1 }).map((_, rowIndex) => (
            <div
              key={`hline-${rowIndex}`}
              className="absolute left-0 right-0 border-t border-neutral-700/50"
              style={{ top: `${rowIndex * rowHeight}px`, height: "1px" }}
            ></div>
          ))}

          {/* Content Area for events - positioned above lines */}
          <div
            className="absolute top-0 left-0"
            style={{
              width: `${totalSteps * stepWidth}px`,
              height: `${numPads * rowHeight}px`,
            }}
          >
            {Array.from({ length: numPads }).map((_, padIndex) => (
              <div
                key={`pad-row-content-${padIndex}`}
                className="relative"
                style={{ height: `${rowHeight}px` }}
              >
                {trackLog
                  .filter((event) => event.padId === padIndex)
                  .map((event) => (
                    <div
                      key={`event-${event.padId}-${event.startTime}`}
                      className="absolute bg-orange-500/70 rounded-sm border border-orange-400 flex items-center justify-center overflow-hidden"
                      style={{
                        top: `2px`, // Small offset within the row
                        height: `${rowHeight - 4}px`, // Make it slightly smaller than row height
                        left: `${event.startTime * stepWidth}px`,
                        width: `${
                          Math.max(1, event.duration) * stepWidth - 2
                        }px`, // Ensure min width, slight padding
                      }}
                    >
                      {/* <span className="text-xs text-white truncate">{event.padId}</span> */}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
