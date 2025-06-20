import { useState, useEffect, useRef } from "react";

import useWorkspaceStore from "@/lib/stores/workspace";

export const useMetronome = () => {
  const audioContext = useWorkspaceStore((state) => state.audioContext);
  const bpm = useWorkspaceStore((state) => state.bpm);

  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playClick = () => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  useEffect(() => {
    if (isMetronomeActive && audioContext) {
      const interval = 60000 / bpm; // Convert BPM to milliseconds

      playClick(); // Play immediately

      intervalRef.current = setInterval(() => {
        playClick();
        setCurrentBeat((beat) => (beat % 4) + 1);
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMetronomeActive, audioContext, bpm]);

  return {
    currentBeat,
    isMetronomeActive,
    setIsMetronomeActive,
  };
};
