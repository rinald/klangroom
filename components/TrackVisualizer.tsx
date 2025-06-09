import { keyMap } from "@/lib/hooks/useKeyboardControls";

import type { TrackEvent, FreeTrackEvent } from "@/lib/types";

type Props = {
  isTrackPlaying: boolean;
  progressPercentage: number;
  totalSteps: number;
  stepWidth: number;
  numPads: number;
  rowHeight: number;
  currentEvents: (TrackEvent | FreeTrackEvent)[];
};

const TrackVisualizer = ({
  isTrackPlaying,
  progressPercentage,
  totalSteps,
  stepWidth,
  numPads,
  rowHeight,
  currentEvents,
}: Props) => {
  return (
    <div className="flex-grow rounded-md border border-neutral-600 overflow-auto relative">
      {/* Playback Position Indicator */}
      {isTrackPlaying && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
          style={{
            left: `${(progressPercentage / 100) * totalSteps * stepWidth}px`,
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
                  .map((event) => (
                    <div
                      key={`event-${event.padId}-${event.startTime}`}
                      className="absolute bg-primary/70 rounded-sm border border-primary flex items-center justify-center overflow-hidden"
                      style={{
                        top: `${rowHeight * event.padId + 2}px`, // Small offset within the row
                        height: `${rowHeight - 4}px`, // Make it slightly smaller than row height
                        left: `${event.startTime * stepWidth}px`,
                        width: `${Math.max(1, event.duration) * stepWidth - 2}px`, // Ensure min width, slight padding
                      }}
                    >
                      <span className="text-xs text-white truncate">
                        {event.padId + 1}
                      </span>
                    </div>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackVisualizer;
