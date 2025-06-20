import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { DEFAULT_BPM, DEFAULT_QUANTIZATION } from "@/lib/constants";
import type { AppSample } from "@/lib/types";

type State = {
  audioContext?: AudioContext;
  samples: Record<string, AppSample>;
  lastSampleId: string | null;
  activePads: Record<number, boolean>;
  // track configuration
  bpm: number; // beats per minute
  trackLength: number; // in bars
  quantization: number;
};

type Actions = {
  setBpm: (bpm: number) => void;
  setTrackLength: (length: number) => void;
  setQuantization: (quantization: number) => void;
  setSamples: (samples: Record<string, AppSample>) => void;
};

const useWorkspaceStore = create<State & Actions>()(
  devtools((set) => ({
    // state
    audioContext: new AudioContext(),
    samples: {},
    lastSampleId: null,
    activePads: {},
    bpm: DEFAULT_BPM,
    trackLength: 4,
    quantization: DEFAULT_QUANTIZATION,
    // actions
    setBpm: (bpm: number) => set({ bpm }),
    setTrackLength: (length: number) => set({ trackLength: length }),
    setQuantization: (quantization: number) => set({ quantization }),
    setSamples: (samples: Record<string, AppSample>) => set({ samples }),
  })),
);

export default useWorkspaceStore;
