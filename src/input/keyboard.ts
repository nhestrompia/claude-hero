/**
 * Keyboard input handler — listens for raw keypress events on stdin.
 *
 * Key mapping:
 *   A / a → lane 0 (green)
 *   S / s → lane 1 (red)
 *   D / d → lane 2 (yellow)
 *   F / f → lane 3 (blue)
 *   Q / q → quit
 *   Ctrl+C → quit
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";

export interface KeyEvent {
  lane: number; // 0–3
  timeMs: number; // performance.now() at press
}

const KEY_TO_LANE: Record<string, number> = {
  a: 0,
  A: 0,
  s: 1,
  S: 1,
  d: 2,
  D: 2,
  f: 3,
  F: 3,
};

export class Keyboard extends EventEmitter {
  private readonly boundHandler: (chunk: Buffer) => void;

  /**
   * Emits:
   *   'hit'      (KeyEvent)  — a lane key was pressed
   *   'release'  (number)    — a lane key was released (best-effort)
   *   'quit'                 — Q or Ctrl+C pressed
   */
  constructor() {
    super();
    this.boundHandler = this.onData.bind(this);
  }

  start(): void {
    process.stdin.on("data", this.boundHandler);
  }

  stop(): void {
    process.stdin.removeListener("data", this.boundHandler);
  }

  private onData(chunk: Buffer): void {
    const str = chunk.toString("utf-8");

    for (const ch of str) {
      // Ctrl+C = \x03
      if (ch === "\x03" || ch === "q" || ch === "Q") {
        this.emit("quit");
        return;
      }

      const lane = KEY_TO_LANE[ch];
      if (lane !== undefined) {
        const event: KeyEvent = { lane, timeMs: performance.now() };
        this.emit("hit", event);
      }
    }
  }
}
