import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppSample } from "@/lib/types";
import { drawWaveform } from "@/lib/utils";
import {
  PlayIcon,
  PauseIcon,
  SquareIcon as StopIcon,
  UploadCloudIcon,
} from "lucide-react";

interface MainSampleAreaProps {
  audioContext: AudioContext | null;
  onSampleLoad: (sample: AppSample, file?: File) => void; // Added File for potential re-use
  // We might not need currentMasterSample here if we manage global playback differently
  // currentMasterSample: AppSample | null;
  playSample: (
    sampleId: string,
    startTime?: number,
    duration?: number,
    onEnded?: () => void,
  ) => AudioBufferSourceNode | undefined;
  stopSample: (sampleId: string) => void;
  isPlaying: (sampleId: string) => boolean;
  latestLoadedSample: AppSample | null; // To display name and control its playback
  assignChopToPad: (
    padId: number,
    sampleId: string,
    startTime: number,
    duration: number,
  ) => void;
  selectedPadForAssignment: number | null;
  clearSelectedPadForAssignment: () => void;
  getSamplePlaybackStartTime: (sampleId: string) => number | null; // To get AudioContext time when sample started
}

export default function MainSampleArea({
  audioContext,
  onSampleLoad,
  playSample,
  stopSample,
  isPlaying: isSamplePlayingGlobal, // Renamed to avoid conflict
  latestLoadedSample,
  assignChopToPad,
  selectedPadForAssignment,
  clearSelectedPadForAssignment,
  getSamplePlaybackStartTime,
}: MainSampleAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false); // Renamed from isDragging for clarity
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const dragStartPercentRef = useRef<number | null>(null); // Using ref for drag start, doesn't need to trigger re-render
  const [playheadPercent, setPlayheadPercent] = useState<number | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [currentSampleSource, setCurrentSampleSource] =
    useState<AudioBufferSourceNode | null>(null);

  // Function to update playhead
  const updatePlayhead = useCallback(() => {
    if (
      !audioContext ||
      !latestLoadedSample ||
      !isSamplePlayingGlobal(latestLoadedSample.id)
    ) {
      setPlayheadPercent(null);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const sampleStartTime = getSamplePlaybackStartTime(latestLoadedSample.id);
    if (sampleStartTime === null) {
      setPlayheadPercent(null); // Not playing or start time unknown
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const elapsedTime = audioContext.currentTime - sampleStartTime;
    let currentPercent = elapsedTime / latestLoadedSample.buffer.duration;

    let chopStartTime = 0;
    let chopDuration = latestLoadedSample.buffer.duration;

    if (selection && selection.end > selection.start && currentSampleSource) {
      // If a chop was played, playhead is relative to the chop
      chopStartTime = selection.start * latestLoadedSample.buffer.duration;
      chopDuration =
        (selection.end - selection.start) * latestLoadedSample.buffer.duration;
      currentPercent = elapsedTime / chopDuration;
      if (currentPercent > 1) currentPercent = 1; // Cap at end of chop
      setPlayheadPercent(
        selection.start + currentPercent * (selection.end - selection.start),
      );
    } else {
      if (currentPercent > 1) currentPercent = 1; // Cap at end of sample
      setPlayheadPercent(currentPercent);
    }

    if (currentPercent < 1) {
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      setPlayheadPercent(null); // Reset when done
      // isPlaying state should be updated by onEnded callback from parent
    }
  }, [
    audioContext,
    latestLoadedSample,
    isSamplePlayingGlobal,
    selection,
    getSamplePlaybackStartTime,
    currentSampleSource,
  ]);

  useEffect(() => {
    if (latestLoadedSample && isSamplePlayingGlobal(latestLoadedSample.id)) {
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);
    } else {
      setPlayheadPercent(null);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [latestLoadedSample, isSamplePlayingGlobal, updatePlayhead]);

  useEffect(() => {
    if (waveformCanvasRef.current) {
      drawWaveform(
        waveformCanvasRef.current,
        latestLoadedSample?.buffer ?? null,
        selection ?? undefined,
        playheadPercent,
      );
    }
  }, [latestLoadedSample, selection, playheadPercent]);

  const processFile = useCallback(
    async (file: File) => {
      if (audioContext) {
        setPlayheadPercent(null);
        if (latestLoadedSample && isSamplePlayingGlobal(latestLoadedSample.id))
          stopSample(latestLoadedSample.id);
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
            setSelection(null);
          },
          (error) => console.error("Error decoding audio data:", error),
        );
      }
    },
    [
      audioContext,
      onSampleLoad,
      latestLoadedSample,
      isSamplePlayingGlobal,
      stopSample,
    ],
  );

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files?.[0];
      if (file && file.type.startsWith("audio/")) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePlayPauseSample = () => {
    if (!latestLoadedSample) return;
    if (isSamplePlayingGlobal(latestLoadedSample.id)) {
      stopSample(latestLoadedSample.id);
      setCurrentSampleSource(null);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      setPlayheadPercent(null);
    } else {
      let sourceNode;
      const onEnded = () => {
        setCurrentSampleSource(null);
        setPlayheadPercent(null); // Ensure playhead resets on natural end
        // Global playing state is handled by KlangroomLayout's onEnded
      };

      if (selection && selection.end > selection.start) {
        const duration = latestLoadedSample.buffer.duration;
        const startTime = selection.start * duration;
        const chopDuration = (selection.end - selection.start) * duration;
        sourceNode = playSample(
          latestLoadedSample.id,
          startTime,
          chopDuration,
          onEnded,
        );
      } else {
        sourceNode = playSample(
          latestLoadedSample.id,
          undefined,
          undefined,
          onEnded,
        );
      }
      if (sourceNode) setCurrentSampleSource(sourceNode);
    }
  };

  const handleStopSample = () => {
    if (latestLoadedSample) {
      stopSample(latestLoadedSample.id);
      setCurrentSampleSource(null);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      setPlayheadPercent(null);
    }
  };

  // Waveform interaction
  const getMousePositionPercent = useCallback((clientX: number): number => {
    if (!waveformCanvasRef.current) return 0;
    const rect = waveformCanvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const handleCanvasMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ) => {
    if (!latestLoadedSample) return;
    event.preventDefault();
    // If playing, stop and reset playhead before selection
    if (isSamplePlayingGlobal(latestLoadedSample.id)) {
      handleStopSample();
    }
    const startPercent = getMousePositionPercent(event.clientX);
    setIsSelecting(true);
    dragStartPercentRef.current = startPercent;
    setSelection({ start: startPercent, end: startPercent });
  };

  // Define handleAssignToSelectedPad first
  const handleAssignToSelectedPad = useCallback(() => {
    if (
      latestLoadedSample &&
      selection &&
      selection.end > selection.start &&
      selectedPadForAssignment !== null
    ) {
      const duration = latestLoadedSample.buffer.duration;
      const startTime = selection.start * duration;
      const chopDuration = (selection.end - selection.start) * duration;
      assignChopToPad(
        selectedPadForAssignment,
        latestLoadedSample.id,
        startTime,
        chopDuration,
      );
      setSelection(null); // Optionally clear selection after assignment
      clearSelectedPadForAssignment(); // Clear the selected pad
    }
  }, [
    latestLoadedSample,
    selection,
    selectedPadForAssignment,
    assignChopToPad,
    clearSelectedPadForAssignment,
  ]);

  const handleGlobalMouseMove = useCallback(
    (event: MouseEvent) => {
      if (
        !isSelecting ||
        dragStartPercentRef.current === null ||
        !latestLoadedSample
      )
        return;
      const currentPercent = getMousePositionPercent(event.clientX);
      setSelection({
        start: Math.min(dragStartPercentRef.current, currentPercent),
        end: Math.max(dragStartPercentRef.current, currentPercent),
      });
    },
    [isSelecting, latestLoadedSample, getMousePositionPercent],
  );

  const handleGlobalMouseUp = useCallback(() => {
    if (!isSelecting) return;
    setIsSelecting(false);
    dragStartPercentRef.current = null;
    if (
      selectedPadForAssignment !== null &&
      selection &&
      selection.end > selection.start &&
      latestLoadedSample
    ) {
      handleAssignToSelectedPad();
    }
  }, [
    isSelecting,
    selectedPadForAssignment,
    selection,
    latestLoadedSample,
    handleAssignToSelectedPad,
  ]);

  // Effect for global mouse listeners
  useEffect(() => {
    if (isSelecting) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    } else {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isSelecting, handleGlobalMouseMove, handleGlobalMouseUp]);

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* <TransportControls /> */}
      <Card className="flex-grow bg-neutral-700 border-neutral-600 rounded-lg flex flex-col">
        <CardHeader className="pb-2 pt-3 flex flex-row justify-between items-center">
          <CardTitle className="text-neutral-200 text-sm font-medium">
            SAMPLE CONTROL
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              asChild
              variant="outline"
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8 px-3"
            >
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex items-center"
              >
                <UploadCloudIcon className="w-3 h-3 mr-1.5" /> Load
              </label>
            </Button>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {latestLoadedSample &&
              selection &&
              selection.end > selection.start &&
              selectedPadForAssignment === null && (
                <p className="text-xs text-orange-400 animate-pulse">
                  Click a pad to assign selection
                </p>
              )}
            {latestLoadedSample &&
              selection &&
              selection.end > selection.start &&
              selectedPadForAssignment !== null && (
                <Button
                  onClick={handleAssignToSelectedPad}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs h-8 px-3"
                >
                  Assign to Pad {selectedPadForAssignment + 1}
                </Button>
              )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center p-3 space-y-2">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="w-full h-[60px] border border-dashed border-neutral-500 rounded-md flex items-center justify-center bg-neutral-800/30 cursor-pointer hover:border-orange-400 transition-colors p-2"
          >
            {latestLoadedSample ? (
              <div className="text-center">
                <p className="text-neutral-300 text-xs">
                  Loaded: {latestLoadedSample.name}
                </p>
                <p className="text-neutral-400 text-[10px]">
                  Duration: {latestLoadedSample.buffer.duration.toFixed(2)}s
                </p>
              </div>
            ) : (
              <p className="text-neutral-400 text-sm text-center">
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex items-center"
                >
                  Drag & Drop Audio File Here or Click{" "}
                  <UploadCloudIcon className="w-3 h-3 inline-block mx-1" />
                  Load
                </label>
              </p>
            )}
          </div>
          {/* Waveform and its controls */}
          <div className="w-full flex-grow bg-neutral-800/50 rounded-md relative overflow-hidden border border-neutral-600 flex flex-col justify-between">
            <canvas
              ref={waveformCanvasRef}
              width={600}
              height={120} // Adjusted height a bit
              className="w-full flex-grow cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
            />
            {latestLoadedSample && (
              <div className="p-1.5 bg-neutral-700/50 border-t border-neutral-600 flex items-center justify-center space-x-2">
                <Button
                  onClick={handlePlayPauseSample}
                  variant="ghost"
                  size="sm"
                  className="text-neutral-200 hover:bg-neutral-600 h-7 px-2"
                >
                  {isSamplePlayingGlobal(latestLoadedSample.id) ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={handleStopSample}
                  variant="ghost"
                  size="sm"
                  className="text-neutral-200 hover:bg-neutral-600 h-7 px-2"
                >
                  <StopIcon className="w-4 h-4" />
                </Button>
                <span className="text-xs text-neutral-400">
                  {selection
                    ? `Sel: ${(
                        selection.start * latestLoadedSample.buffer.duration
                      ).toFixed(2)}s - ${(
                        selection.end * latestLoadedSample.buffer.duration
                      ).toFixed(2)}s`
                    : "No selection"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
