/**
 * Cyberpunk visual effects for VibeBlock.
 */

import { rgb } from "../game/pieces";
import { ansi, writeAt } from "./screen";

const GLITCH_CHARS = "░▒▓█▀▄▌▐■□▪●○◆◇";

const NEON_RGB: [number, number, number][] = [
  [0, 255, 255], // cyan
  [255, 0, 255], // magenta
  [255, 105, 180], // pink
  [57, 255, 20], // acid green
  [230, 255, 0], // yellow
  [255, 102, 0], // orange
];

/** Writes a row of random glitch characters in neon colors (2×width terminal chars). */
export function glitchRow(
  termRow: number,
  termCol: number,
  widthCells: number,
): void {
  let str = "";
  for (let i = 0; i < widthCells; i++) {
    const [r, g, b] = NEON_RGB[Math.floor(Math.random() * NEON_RGB.length)];
    const ch = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
    str += rgb(r, g, b) + ch + ch;
  }
  writeAt(termRow, termCol, str + ansi.reset);
}

/** Wraps text in true-color neon ANSI codes. */
export function neonText(
  text: string,
  r: number,
  g: number,
  b: number,
): string {
  return `${rgb(r, g, b)}${text}${ansi.reset}`;
}

/** Returns a pulsing neon color based on frame counter. */
export function pulseColor(
  r: number,
  g: number,
  b: number,
  frame: number,
): string {
  const factor = 0.65 + 0.35 * Math.sin(frame * 0.12);
  return rgb(
    Math.min(255, Math.round(r * factor)),
    Math.min(255, Math.round(g * factor)),
    Math.min(255, Math.round(b * factor)),
  );
}

/** Single column of random falling matrix characters (for lobby bg). */
export function matrixDrip(termRow: number, termCol: number): void {
  const chars = "01アイウエオカキクケコ!@#$%";
  const ch = chars[Math.floor(Math.random() * chars.length)];
  const bright = Math.random() > 0.85;
  const color = bright ? "\x1b[38;2;57;255;20m" : "\x1b[38;2;0;120;0m";
  writeAt(termRow, termCol, color + ch + ansi.reset);
}
