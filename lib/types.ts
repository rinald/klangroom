export interface AppSample {
  id: string; // Unique ID for the sample
  name: string;
  buffer: AudioBuffer;
  sourceNode?: AudioBufferSourceNode; // To keep track of the currently playing source for this sample
}

export interface PadAssignment {
  sampleId: string; // ID of the AppSample
  startTime?: number; // Start time of the chop in seconds
  duration?: number;  // Duration of the chop in seconds
}

// Map Pad ID (0-15) to a PadAssignment
export type PadAssignments = Record<number, PadAssignment | null>; 