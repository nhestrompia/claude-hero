/**
 * Central game state — updated each frame.
 */

import { ClaudeState } from "../claude-runner";

export interface GameState {
  /** Milliseconds since audio started (the game clock) */
  currentTimeMs: number;
  /** Total score */
  score: number;
  /** Current consecutive hit streak */
  combo: number;
  /** Current score multiplier (combo / 10, min 1, max e.g. 4) */
  multiplier: number;
  /** Max combo achieved this run */
  maxCombo: number;
  /** Hit breakdown */
  perfects: number;
  goods: number;
  misses: number;
  /** Notes that have been scored (by id) */
  hitNotes: Set<number>;
  /** Notes that have been missed (passed hit window) */
  missedNotes: Set<number>;
  /** Whether the game loop is running */
  isRunning: boolean;
  /** Whether the player pressed quit */
  quitRequested: boolean;
  /** Current state of the Claude subprocess */
  claudeState: ClaudeState;
  /** Which lanes currently have a key held (for visual hit zone feedback) */
  activeKeys: Set<number>;
  /** Elapsed time from Claude runner (ms) */
  elapsedMs: number;
  /** Formatted elapsed string e.g. "8.2s" */
  elapsedFormatted: string;
}

export function createInitialState(): GameState {
  return {
    currentTimeMs: 0,
    score: 0,
    combo: 0,
    multiplier: 1,
    maxCombo: 0,
    perfects: 0,
    goods: 0,
    misses: 0,
    hitNotes: new Set(),
    missedNotes: new Set(),
    isRunning: false,
    quitRequested: false,
    claudeState: "idle",
    activeKeys: new Set(),
    elapsedMs: 0,
    elapsedFormatted: "0.0s",
  };
}
