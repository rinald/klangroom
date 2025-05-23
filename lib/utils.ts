import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer | null,
  selection?: { start: number; end: number } // As percentage of width (0 to 1)
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!audioBuffer) {
    ctx.fillStyle = "#404040"; // neutral-600
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#a3a3a3"; // neutral-400
    ctx.textAlign = "center";
    ctx.font = "12px sans-serif";
    ctx.fillText("No waveform data", width / 2, height / 2);
    return;
  }

  const data = audioBuffer.getChannelData(0); // Use the first channel
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.fillStyle = "#262626"; // neutral-800 background for waveform area
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = "#0ea5e9"; // sky-500 for the waveform line
  ctx.beginPath();
  ctx.moveTo(0, amp);

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    ctx.lineTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp); 
  }
  ctx.lineTo(width, amp);
  ctx.stroke();

  // Draw selection rectangle
  if (selection && selection.start >= 0 && selection.end > selection.start) {
    ctx.fillStyle = "rgba(251, 146, 60, 0.3)"; // orange-400 with alpha
    const selectX = selection.start * width;
    const selectWidth = (selection.end - selection.start) * width;
    ctx.fillRect(selectX, 0, selectWidth, height);

    ctx.strokeStyle = "#fb923c"; // orange-400
    ctx.lineWidth = 1;
    ctx.strokeRect(selectX, 0, selectWidth, height);
  }
}
