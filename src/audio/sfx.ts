/**
 * Sound effects player for VibeBlock.
 * Uses the same platform-aware approach as AudioPlayer (afplay on macOS, ffplay on Linux).
 * All calls are fire-and-forget — errors are silently ignored.
 */

import { spawn } from "child_process";
import * as path from "path";

const SOUNDS_DIR = path.join(__dirname, "..", "..", "sounds");

// Resolve per-platform player binary
function getPlayerArgs(file: string): [string, string[]] | null {
  const full = path.join(SOUNDS_DIR, file);
  const platform = process.platform;

  if (platform === "darwin") {
    return ["afplay", [full]];
  }
  // Linux / others — try ffplay
  return ["ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet", full]];
}

let soundEnabled = false;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function play(file: string): void {
  if (!soundEnabled) return;
  const args = getPlayerArgs(file);
  if (!args) return;
  try {
    const [bin, argv] = args;
    const child = spawn(bin, argv, {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
  } catch (_) {
    // Silently ignore — game continues without audio
  }
}

export function playMove(): void {
  play("move.wav");
}

export function playLineClear(): void {
  play("clean.wav");
}

export function playClaudeDone(): void {
  play("notification.wav");
}
