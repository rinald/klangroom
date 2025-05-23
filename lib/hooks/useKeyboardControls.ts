import { useEffect, useCallback } from "react";

interface UseKeyboardControlsProps {
  onPadActivate: (padId: number) => void;
}

const keyMap: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  q: 4,
  w: 5,
  e: 6,
  r: 7,
  a: 8,
  s: 9,
  d: 10,
  f: 11,
  z: 12,
  x: 13,
  c: 14,
  v: 15,
};

export const useKeyboardControls = ({
  onPadActivate,
}: UseKeyboardControlsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const padId = keyMap[event.key.toLowerCase()];
      if (padId !== undefined) {
        onPadActivate(padId);
      }
    },
    [onPadActivate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
};
