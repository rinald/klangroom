import {
  GaugeIcon as MetronomeIcon,
  DiscIcon as RecordIcon,
  PlayIcon,
  Square as StopIcon,
  RotateCcwIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMetronome } from "@/lib/hooks/useMetronome";
import { useTrackPlayback } from "@/lib/hooks/useTrackPlayback";

import type {
  TrackEvent,
  FreeTrackEvent,
  RecordingMode,
  PadAssignments,
  AppSample,
} from "@/lib/types";
import TrackVisualizer from "./TrackVisualizer";
import useWorkspaceStore from "@/lib/stores/workspace";

interface Props {
  padAssignments: PadAssignments;
  loadedSamples: Record<string, AppSample>;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  recordingMode: RecordingMode;
  setRecordingMode: React.Dispatch<React.SetStateAction<RecordingMode>>;
  trackDurationSeconds: number;
  currentEvents: (TrackEvent | FreeTrackEvent)[];
  clearTrack: () => void;
}

export default function TrackControls({
  padAssignments,
  loadedSamples,
  isRecording,
  startRecording,
  stopRecording,
  recordingMode,
  setRecordingMode,
  trackDurationSeconds,
  currentEvents,
  clearTrack,
}: Props) {
  const bpm = useWorkspaceStore((state) => state.bpm);
  const setBpm = useWorkspaceStore((state) => state.setBpm);
  const trackLength = useWorkspaceStore((state) => state.trackLength);
  const setTrackLength = useWorkspaceStore((state) => state.setTrackLength);
  const quantization = useWorkspaceStore((state) => state.quantization);

  const stepsPerBar = quantization;
  const totalSteps = trackLength * stepsPerBar;
  const numPads = 16;
  const rowHeight = 24; // px
  const stepWidth = 20; // px

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleMetronomeClick = () => {
    setIsMetronomeActive(!isMetronomeActive);
  };

  const handlePlayClick = () => {
    if (isPlaying) {
      stopTrack();
    } else {
      playTrack(currentEvents, recordingMode);
    }
  };

  const audioContext = useWorkspaceStore((state) => state.audioContext);

  // Metronome scheduling logic
  const { currentBeat, isMetronomeActive, setIsMetronomeActive } = useMetronome(
    audioContext,
    bpm,
  );

  // Precise Web Audio API playback hook
  const {
    isPlaying,
    currentTime,
    loopEnabled,
    playTrack,
    stopTrack,
    toggleLoop: toggleTrackLoop,
  } = useTrackPlayback({
    padAssignments,
    loadedSamples,
  });

  const progressPercentage =
    trackDurationSeconds > 0 ? (currentTime / trackDurationSeconds) * 100 : 0;

  return (
    <Card className="border-neutral-600 rounded-lg flex flex-col h-full">
      <CardContent className="flex-grow flex flex-col space-y-2 p-3 overflow-hidden">
        {/* Track Info & Controls Row 1 */}
        <div className="flex items-center justify-between space-x-2 pb-2 border-b border-neutral-600 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">BPM:</span>
            <Input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 border-neutral-600 text-neutral-200 p-1 rounded h-8 text-sm text-center"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">Length (Bars):</span>
            <Input
              type="number"
              value={trackLength}
              onChange={(e) => setTrackLength(Number(e.target.value))}
              className="w-12 border-neutral-600 text-neutral-200 p-1 rounded h-8 text-sm text-center"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">Mode:</span>
            <Select
              defaultValue={recordingMode}
              onValueChange={(value: RecordingMode) => setRecordingMode(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select recording mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantized">Quantized</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              onClick={handleMetronomeClick}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                isMetronomeActive ? "text-white" : "text-neutral-300"
              } hover:bg-neutral-600`}
            >
              {currentBeat}
              <MetronomeIcon
                className={cn("w-4 h-4", currentBeat % 2 && "-scale-x-100")}
              />
            </Button>
          </div>
        </div>

        {/* Recording & Playback Controls Row 2 */}
        <div className="flex items-center justify-between space-x-2 pb-2 border-b border-neutral-600 flex-shrink-0">
          <div className="flex items-center space-x-1">
            <Button
              onClick={handleRecordClick}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                isRecording ? "text-red-500 animate-pulse" : "text-neutral-300"
              } hover:bg-neutral-600`}
            >
              <RecordIcon className="w-4 h-4" />
              <span className="text-xs ml-1">REC</span>
            </Button>
            <Button
              onClick={handlePlayClick}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                isPlaying ? "text-red-400" : "text-green-400"
              } hover:bg-neutral-600`}
              disabled={currentEvents.length === 0}
            >
              {isPlaying ? (
                <StopIcon className="w-4 h-4" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={toggleTrackLoop}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${
                loopEnabled ? "text-blue-400" : "text-neutral-500"
              } hover:bg-neutral-600`}
            >
              <RotateCcwIcon className="w-4 h-4" />
            </Button>
            <Button
              onClick={clearTrack}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-neutral-500 hover:bg-neutral-600 hover:text-red-400"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-neutral-400">
              {Math.floor(currentTime * 10) / 10}s /{" "}
              {Math.floor(trackDurationSeconds * 10) / 10}s
            </span>
            <div className="w-20 h-2 bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-400 transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Track Visualization Area */}
        <TrackVisualizer
          isTrackPlaying={isPlaying}
          progressPercentage={progressPercentage}
          totalSteps={totalSteps}
          stepWidth={stepWidth}
          numPads={numPads}
          rowHeight={rowHeight}
          currentEvents={currentEvents}
          recordingMode={recordingMode}
          trackDurationSeconds={trackDurationSeconds}
        />
      </CardContent>
    </Card>
  );
}
