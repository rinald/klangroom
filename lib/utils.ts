import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer | null,
  selection?: { start: number; end: number }, // As percentage of width (0 to 1)
  playheadPositionPercent?: number | null, // Playhead position as percentage (0 to 1)
) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  // Set the canvas attribute size factoring in DPR, then style size to fit layout
  if (canvas.width !== rect.width * dpr) {
    canvas.width = rect.width * dpr;
  }
  if (canvas.height !== rect.height * dpr) {
    canvas.height = rect.height * dpr;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Use the styled dimensions for drawing logic, not the attribute dimensions
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  ctx.clearRect(0, 0, displayWidth, displayHeight);

  if (!audioBuffer) {
    ctx.fillStyle = "#a3a3a3"; // neutral-400
    ctx.textAlign = "center";
    ctx.font = "14px Space Grotesk";
    ctx.fillText("No waveform data", displayWidth / 2, displayHeight / 2);
    return;
  }

  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / displayWidth);
  const amp = displayHeight / 2;

  ctx.lineWidth = 1; // Thinner line might look crisper with DPR scaling
  ctx.strokeStyle = "#38bdf8"; // A lighter, more vibrant sky blue (sky-400)
  ctx.beginPath();
  ctx.moveTo(0, amp);

  for (let i = 0; i < displayWidth; i++) {
    let min = 1.0;
    let max = -1.0;
    // Aggregate data points for each pixel on the display width
    for (let j = 0; j < step; j++) {
      const dataIndex = Math.floor(
        i * (data.length / displayWidth) +
          j * (data.length / displayWidth / step),
      );
      if (dataIndex < data.length) {
        const datum = data[dataIndex];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
    }
    ctx.lineTo(i, (1 + min) * amp);
    ctx.lineTo(i, (1 + max) * amp);
  }
  ctx.lineTo(displayWidth, amp);
  ctx.stroke();

  if (selection && selection.start >= 0 && selection.end > selection.start) {
    ctx.fillStyle = "rgba(251, 146, 60, 0.3)";
    const selectX = selection.start * displayWidth;
    const selectWidth = (selection.end - selection.start) * displayWidth;
    ctx.fillRect(selectX, 0, selectWidth, displayHeight);
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 0.5; // Thinner selection border
    ctx.strokeRect(selectX, 0, selectWidth, displayHeight);
  }

  // Draw playhead
  if (
    playheadPositionPercent !== null &&
    playheadPositionPercent !== undefined &&
    playheadPositionPercent >= 0 &&
    playheadPositionPercent <= 1
  ) {
    ctx.strokeStyle = "#f87171"; // red-400 for playhead
    ctx.lineWidth = 1;
    const playheadX = playheadPositionPercent * displayWidth;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, displayHeight);
    ctx.stroke();
  }
}
