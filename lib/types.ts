export interface AppSample {
  id: string; // Unique ID for the sample
  name: string;
  buffer: AudioBuffer;
  sourceNode?: AudioBufferSourceNode; // To keep track of the currently playing source for this sample
}

export interface PadAssignment {
  sampleId: string; // ID of the AppSample
  startTime?: number; // Start time of the chop in seconds
  duration?: number; // Duration of the chop in seconds
}

// Map Pad ID (0-15) to a PadAssignment
export type PadAssignments = Record<number, PadAssignment | null>;

// New types for track visualization
export interface TrackEvent {
  padId: number; // Which pad (0-15)
  startTime: number; // Quantized start time (e.g., in 1/8th note steps from the beginning of the track)
  duration: number; // Quantized duration (e.g., in 1/8th note steps)
}

export type TrackLog = TrackEvent[];
