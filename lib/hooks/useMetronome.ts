import { useState, useEffect, useRef } from "react";

export const useMetronome = (
  audioContext: AudioContext | null,
  bpm: number,
) => {
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextMetronomeTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isMetronomeActive && audioContext) {
      const scheduleMetronomeClick = () => {
        if (!isMetronomeActive || !audioContext) return; // Double check, in case state changed

        // Synthesize a simple click sound
        const clickOsc = audioContext.createOscillator();
        const clickGain = audioContext.createGain();
        clickOsc.type = "triangle"; // A short triangle wave can sound like a click
        clickOsc.frequency.setValueAtTime(880, audioContext.currentTime); // A4 pitch
        clickGain.gain.setValueAtTime(1, audioContext.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(
          0.001,
          audioContext.currentTime + 0.05,
        );
        clickOsc.connect(clickGain).connect(audioContext.destination);

        clickOsc.start(nextMetronomeTimeRef.current);
        clickOsc.stop(nextMetronomeTimeRef.current + 0.05);

        // Calculate next click time
        const secondsPerBeat = 60 / bpm;
        nextMetronomeTimeRef.current += secondsPerBeat;

        // Schedule the next one
        const lookahead = 0.1; // 100ms (how far ahead to schedule audio)
        if (
          nextMetronomeTimeRef.current <
          audioContext.currentTime + lookahead + secondsPerBeat
        ) {
          // Check if we need to schedule more
          // Schedule the next call to this function shortly before the next beat
          if (metronomeIntervalRef.current)
            clearInterval(metronomeIntervalRef.current);
          metronomeIntervalRef.current = setTimeout(
            scheduleMetronomeClick,
            (nextMetronomeTimeRef.current -
              audioContext.currentTime -
              lookahead) *
              1000,
          );
        }
      };

      nextMetronomeTimeRef.current = audioContext.currentTime; // Start immediately on the next available tick
      scheduleMetronomeClick(); // Start the scheduler
    } else {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
      nextMetronomeTimeRef.current = 0;
    }

    return () => {
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
    };
  }, [isMetronomeActive, audioContext, bpm]);

  return {
    isMetronomeActive,
    setIsMetronomeActive,
  };
};
