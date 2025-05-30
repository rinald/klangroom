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
          className="absolute top-0 bottom-0 w-0.5 bg-orange-400 z-10 pointer-events-none"
          style={{
            left: `${(progressPercentage / 100) * totalSteps * stepWidth}px`,
          }}
        />
      )}
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
            {currentEvents
              .filter((event) => event.padId === padIndex)
              .map((event) => (
                <div
                  key={`event-${event.padId}-${event.startTime}`}
                  className="absolute bg-orange-500/70 rounded-sm border border-orange-400 flex items-center justify-center overflow-hidden"
                  style={{
                    top: `2px`, // Small offset within the row
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackVisualizer;
