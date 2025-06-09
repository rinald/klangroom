import { keyMap } from "@/lib/hooks/useKeyboardControls";

import type { TrackEvent, FreeTrackEvent, RecordingMode } from "@/lib/types";

type Props = {
  isTrackPlaying: boolean;
  progressPercentage: number;
  totalSteps: number;
  stepWidth: number;
  numPads: number;
  rowHeight: number;
  currentEvents: (TrackEvent | FreeTrackEvent)[];
  recordingMode: RecordingMode;
  trackDurationSeconds: number;
};

const TrackVisualizer = ({
  isTrackPlaying,
  progressPercentage,
  totalSteps,
  stepWidth,
  numPads,
  rowHeight,
  currentEvents,
  recordingMode,
  trackDurationSeconds,
}: Props) => {
  // Calculate total visualization width
  const totalWidth = totalSteps * stepWidth;
  
  // Helper function to get event position and width based on recording mode
  const getEventPosition = (event: TrackEvent | FreeTrackEvent) => {
    if (recordingMode === 'quantized') {
      const quantizedEvent = event as TrackEvent;
      return {
        left: quantizedEvent.startTime * stepWidth,
        width: Math.max(1, quantizedEvent.duration) * stepWidth - 2,
      };
    } else {
      const freeEvent = event as FreeTrackEvent;
      // For free mode, position based on time relative to track duration
      const leftPercent = trackDurationSeconds > 0 ? freeEvent.startTime / trackDurationSeconds : 0;
      const widthPercent = trackDurationSeconds > 0 ? freeEvent.duration / trackDurationSeconds : 0;
      return {
        left: leftPercent * totalWidth,
        width: Math.max(2, widthPercent * totalWidth - 2), // Ensure minimum width
      };
    }
  };
  return (
    <div className="flex-grow rounded-md border border-neutral-600 overflow-auto relative">
      {/* Playback Position Indicator */}
      {isTrackPlaying && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
          style={{
            left: `${(progressPercentage / 100) * totalWidth}px`,
          }}
        />
      )}

      {/* Content Area for events - positioned above lines */}
      <table
        className="absolute top-0 left-0"
        style={{
          width: `100%`,
          height: `${numPads * rowHeight}px`,
        }}
      >
        <tbody>
          {Array.from({ length: numPads }).map((_, padIndex) => (
            <tr
              key={`pad-row-content-${padIndex}`}
              className="relative"
              style={{ height: `${rowHeight}px` }}
            >
              <td className={padIndex % 2 ? "bg-secondary" : "bg-card"}>
                <span className="pre px-2 border-r-2 font-mono">
                  {Object.keys(keyMap)[padIndex].toUpperCase()}
                </span>
              </td>
              <td>
                {currentEvents
                  .filter((event) => event.padId === padIndex)
                  .map((event) => {
                    const { left, width } = getEventPosition(event);
                    return (
                      <div
                        key={`event-${event.padId}-${event.startTime}`}
                        className="absolute bg-primary/70 rounded-sm border border-primary flex items-center justify-center overflow-hidden"
                        style={{
                          top: "2px", // Small offset within the row
                          height: `${rowHeight - 4}px`, // Make it slightly smaller than row height
                          left: `${left}px`,
                          width: `${width}px`,
                        }}
                      >
                        <span className="text-xs text-white truncate">
                          {event.padId + 1}
                        </span>
                      </div>
                    );
                  })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackVisualizer;
