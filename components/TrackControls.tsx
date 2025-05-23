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

interface TrackControlsProps {
  // Props will be added later for BPM, length, etc.
}

export default function TrackControls({}: TrackControlsProps) {
  return (
    <Card className="bg-neutral-700 border-neutral-600 rounded-lg flex flex-col h-full">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-neutral-200 text-sm font-medium">
          TRACK CONTROLS
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-2 p-3">
        {/* Track Info & Controls */}
        <div className="flex items-center justify-between space-x-2 pb-2 border-b border-neutral-600">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">BPM:</span>
            <Input
              type="number"
              defaultValue={120}
              className="w-16 bg-neutral-800 border-neutral-600 text-neutral-200 p-1 rounded h-8 text-sm text-center"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">Length (Bars):</span>
            <Input
              type="number"
              defaultValue={4}
              className="w-12 bg-neutral-800 border-neutral-600 text-neutral-200 p-1 rounded h-8 text-sm text-center"
            />
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-300 hover:bg-neutral-600 h-8 px-2"
            >
              <MetronomeIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:bg-neutral-600 h-8 px-2"
            >
              <RecordIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Track Visualization Area */}
        <div className="flex-grow bg-neutral-800/50 rounded-md border border-neutral-600 flex items-center justify-center">
          <p className="text-neutral-500 text-sm">
            Track Visualization (1/8 Quantization)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
