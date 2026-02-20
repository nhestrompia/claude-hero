/**
 * Hit detection and scoring logic.
 */

import { TimedNote } from "../chart/types";
import { GameState } from "./state";

export type HitResult = "perfect" | "good" | "miss";

const PERFECT_WINDOW_MS = 40;
const GOOD_WINDOW_MS = 90;

const PERFECT_SCORE = 100;
const GOOD_SCORE = 50;

/**
 * Find the closest unhit note in the given lane at pressTimeMs.
 * Returns the note and the time delta, or null if none found within the good window.
 */
export function findTarget(
  lane: number,
  pressTimeMs: number,
  notes: TimedNote[],
  hitNotes: Set<number>,
): { note: TimedNote; delta: number } | null {
  let best: { note: TimedNote; delta: number } | null = null;

  for (const note of notes) {
    if (note.lane !== lane) continue;
    if (hitNotes.has(note.id)) continue;

    const delta = Math.abs(pressTimeMs - note.timeMs);
    if (delta > GOOD_WINDOW_MS) continue;
    if (!best || delta < best.delta) {
      best = { note, delta };
    }
  }

  return best;
}

/**
 * Process a keypress at the given lane and time.
 * Mutates state (score, combo, hitNotes, etc.).
 * Returns the hit result so the renderer can show feedback.
 */
export function processHit(
  lane: number,
  pressTimeMs: number,
  notes: TimedNote[],
  state: GameState,
): HitResult {
  const target = findTarget(lane, pressTimeMs, notes, state.hitNotes);

  if (!target) {
    // No note nearby — break combo
    state.combo = 0;
    state.multiplier = 1;
    state.misses++;
    return "miss";
  }

  const { note, delta } = target;
  state.hitNotes.add(note.id);

  let result: HitResult;
  let baseScore: number;

  if (delta <= PERFECT_WINDOW_MS) {
    result = "perfect";
    baseScore = PERFECT_SCORE;
    state.perfects++;
  } else {
    result = "good";
    baseScore = GOOD_SCORE;
    state.goods++;
  }

  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;
  state.multiplier = Math.min(4, Math.floor(state.combo / 10) + 1);
  state.score += baseScore * state.multiplier;

  return result;
}

/**
 * Mark notes that have passed their hit window (plus a grace period) as missed.
 * Called once per frame.
 */
export function processMissedNotes(
  currentTimeMs: number,
  notes: TimedNote[],
  state: GameState,
): number {
  const MISS_GRACE_MS = GOOD_WINDOW_MS + 20;
  let newMisses = 0;

  for (const note of notes) {
    if (state.hitNotes.has(note.id)) continue;
    if (state.missedNotes.has(note.id)) continue;
    if (currentTimeMs - note.timeMs > MISS_GRACE_MS) {
      state.missedNotes.add(note.id);
      state.misses++;
      state.combo = 0;
      state.multiplier = 1;
      newMisses++;
    }
  }

  return newMisses;
}

/**
 * Accuracy percentage (0–100).
 */
export function accuracy(state: GameState): number {
  const total = state.perfects + state.goods + state.misses;
  if (total === 0) return 100;
  return Math.round(((state.perfects + state.goods) / total) * 100);
}
