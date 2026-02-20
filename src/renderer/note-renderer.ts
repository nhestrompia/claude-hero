/**
 * Note renderer — maps timed notes to terminal rows and draws them.
 *
 * Layout model:
 *   Row 1         — header bar
 *   Row 2         — separator
 *   Rows 3…(R-3)  — note fall zone (notes scroll downward)
 *   Row (R-2)     — hit zone (where you press the key)
 *   Row (R-1)     — lane labels [A] [S] [D] [F]
 *   Row R         — status / feedback
 *
 * Notes scroll from top to bottom. A note at timeMs appears at the
 * top of the fall zone `LOOKAHEAD_MS` before its hit time, and reaches
 * the hit zone exactly at its hit time.
 */

import { TimedNote } from "../chart/types";
import { ansi, blankRow, LANE_BG_COLORS, LANE_COLORS, writeAt } from "./screen";

export const LOOKAHEAD_MS = 2000; // how far ahead to show notes
export const TRAIL_MS = 150; // how long after hit time the note remains visible

// Characters used to draw notes and the hit zone
const NOTE_CHAR = "██";
const HIT_ZONE_CHAR = "══";
const HIT_ZONE_ACTIVE_CHAR = "▓▓";

// Per-lane column offsets (for a 4-lane layout centered in the terminal)
// Each lane occupies 4 chars (2 for note + 2 padding)
const LANE_WIDTH = 6; // chars per lane

/** Calculate the starting column for a lane (1-based). */
export function laneCol(lane: number, termCols: number): number {
  const totalWidth = 4 * LANE_WIDTH;
  const leftPad = Math.floor((termCols - totalWidth) / 2) + 1;
  return leftPad + lane * LANE_WIDTH;
}

/** Calculate which terminal row a note should appear at given currentTimeMs. */
export function noteRow(
  noteTimeMs: number,
  currentTimeMs: number,
  fallZoneTop: number,
  fallZoneBottom: number, // hit zone row
): number | null {
  const timeDelta = noteTimeMs - currentTimeMs; // positive = future, negative = past

  if (timeDelta > LOOKAHEAD_MS || timeDelta < -TRAIL_MS) return null;

  const totalMs = LOOKAHEAD_MS + TRAIL_MS;
  const totalRows = fallZoneBottom - fallZoneTop;
  // timeDelta == LOOKAHEAD_MS → top row, timeDelta == 0 → hit zone row
  const fraction = (LOOKAHEAD_MS - timeDelta) / totalMs;
  const row = fallZoneTop + Math.round(fraction * totalRows);
  return Math.min(Math.max(row, fallZoneTop), fallZoneBottom);
}

export interface RenderOptions {
  currentTimeMs: number;
  hitNotes: Set<number>;
  activeKeys: Set<number>; // lanes whose key is currently held
  termCols: number;
  termRows: number;
}

/** Render all visible notes into the fall zone. */
export function renderNotes(notes: TimedNote[], opts: RenderOptions): void {
  const fallTop = 3;
  const fallBottom = opts.termRows - 3; // hit zone

  // Clear the fall zone (erase previous frame)
  for (let row = fallTop; row <= fallBottom; row++) {
    blankRow(row, opts.termCols);
  }

  // Draw hit zone
  drawHitZone(fallBottom, opts);

  // Draw notes
  for (const note of notes) {
    if (opts.hitNotes.has(note.id)) continue; // already hit, skip

    const row = noteRow(
      note.timeMs,
      opts.currentTimeMs,
      fallTop,
      fallBottom - 1,
    );
    if (row === null) continue;

    const col = laneCol(note.lane, opts.termCols);
    const color = LANE_COLORS[note.lane] ?? ansi.fg.white;
    writeAt(row, col, `${color}${ansi.bold}${NOTE_CHAR}${ansi.reset}`);
  }
}

/** Draw the hit zone row and lane brackets. */
function drawHitZone(hitRow: number, opts: RenderOptions): void {
  for (let lane = 0; lane < 4; lane++) {
    const col = laneCol(lane, opts.termCols);
    const isActive = opts.activeKeys.has(lane);
    const color = LANE_COLORS[lane] ?? ansi.fg.white;
    const char = isActive ? HIT_ZONE_ACTIVE_CHAR : HIT_ZONE_CHAR;
    writeAt(hitRow, col, `${color}${char}${ansi.reset}`);
  }
}

/** Draw the bottom label row [A] [S] [D] [F]. */
export function renderLaneLabels(
  row: number,
  termCols: number,
  activeKeys: Set<number>,
): void {
  const labels = ["A", "S", "D", "F"];
  for (let lane = 0; lane < 4; lane++) {
    const col = laneCol(lane, termCols);
    const isActive = activeKeys.has(lane);
    const color = LANE_COLORS[lane] ?? ansi.fg.white;
    const bg = isActive ? LANE_BG_COLORS[lane] : "";
    writeAt(
      row,
      col,
      `${color}${bg}${ansi.bold}[${labels[lane]}]${ansi.reset} `,
    );
  }
}
