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

// Track recording modes
export type RecordingMode = 'quantized' | 'free';

// Pad playback modes
export type PadMode = 'gate' | 'one-shot';

// Quantized track events (current implementation)
export interface TrackEvent {
  padId: number; // Which pad (0-15)
  startTime: number; // Quantized start time (e.g., in 1/8th note steps from the beginning of the track)
  duration: number; // Quantized duration (e.g., in 1/8th note steps)
}

// Unquantized (free) track events with precise timing
export interface FreeTrackEvent {
  padId: number; // Which pad (0-15)
  startTime: number; // Exact start time in seconds from track start
  duration: number; // Exact duration in seconds
  audioContextTime: number; // AudioContext.currentTime when event was recorded
}

// Combined track types
export type TrackLog = TrackEvent[];
export type FreeTrackLog = FreeTrackEvent[];

// Track data that can handle both modes
export interface Track {
  id: string;
  name: string;
  mode: RecordingMode;
  bpm: number;
  quantization: number; // Only relevant for quantized mode
  lengthBars: number;
  events: TrackEvent[] | FreeTrackEvent[];
  createdAt: number;
}

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; // Current playback position in seconds
  startTime: number | null; // AudioContext time when playback started
  loopEnabled: boolean;
}
