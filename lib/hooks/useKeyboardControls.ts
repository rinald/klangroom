import { useEffect, useCallback, useState } from "react";

interface Props {
  onPadDown: (padId: number) => void;
  onPadUp?: (padId: number) => void;
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

export const useKeyboardControls = ({ onPadDown, onPadUp }: Props) => {
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>({});

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (activeKeys[key]) return;

      const padId = keyMap[key];
      if (padId !== undefined) {
        setActiveKeys((prev) => ({ ...prev, [key]: true }));
        onPadDown(padId);
      }
    },
    [onPadDown, activeKeys],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const padId = keyMap[key];
      if (padId !== undefined) {
        setActiveKeys((prev) => ({ ...prev, [key]: false }));
        if (onPadUp) {
          onPadUp(padId);
        }
      }
    },
    [onPadUp],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
};
