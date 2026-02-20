/**
 * GameView — composes and renders a single frame to the terminal.
 *
 * Frame layout (terminal rows, 1-indexed):
 *   Row 1   ─ header: "Claude: THINKING | Time 8.2s | Score 4200 | Combo x3 | q quit"
 *   Row 2   ─ thin separator line
 *   Row 3…(R-3) ─ note fall zone
 *   Row R-2 ─ hit zone (═══)
 *   Row R-1 ─ lane labels [A] [S] [D] [F]
 *   Row R   ─ feedback flash ("PERFECT!", "GOOD", "MISS")
 */

import { Song } from "../chart/types";
import { GameState } from "../game/state";
import { laneCol, renderLaneLabels, renderNotes } from "./note-renderer";
import { ansi, blankRow, getTermSize, writeAt } from "./screen";

export type FeedbackKind = "perfect" | "good" | "miss" | null;

export interface FrameExtras {
  feedback: FeedbackKind;
  feedbackLane: number;
}

export function renderFrame(
  state: GameState,
  song: Song,
  extras: FrameExtras,
): void {
  const { cols, rows } = getTermSize();

  renderHeader(1, cols, state);
  renderSeparator(2, cols);
  renderNotes(song.notes, {
    currentTimeMs: state.currentTimeMs,
    hitNotes: state.hitNotes,
    activeKeys: state.activeKeys,
    termCols: cols,
    termRows: rows,
  });
  renderLaneLabels(rows - 1, cols, state.activeKeys);
  renderFeedback(rows, cols, extras);
}

function renderHeader(row: number, cols: number, state: GameState): void {
  const claudeStatus =
    state.claudeState === "done"
      ? `${ansi.fg.brightGreen}${ansi.bold}Claude: DONE${ansi.reset}`
      : `${ansi.fg.brightCyan}${ansi.bold}Claude: THINKING${ansi.reset}`;

  const timeStr = `Time ${state.elapsedFormatted}`;
  const scoreStr = `Score ${state.score}`;
  const comboStr = state.combo > 1 ? `Combo x${state.combo}` : "";
  const multiplierStr = state.multiplier > 1 ? `×${state.multiplier}` : "";
  const quit = `${ansi.dim}q quit${ansi.reset}`;

  const parts = [claudeStatus, timeStr, scoreStr, comboStr, multiplierStr, quit]
    .filter(Boolean)
    .join(`  ${ansi.fg.brightBlack}│${ansi.reset}  `);

  blankRow(row, cols);
  writeAt(row, 1, parts);
}

function renderSeparator(row: number, cols: number): void {
  writeAt(row, 1, `${ansi.fg.brightBlack}${"─".repeat(cols)}${ansi.reset}`);
}

const FEEDBACK_COLORS: Record<string, string> = {
  perfect: ansi.fg.brightYellow,
  good: ansi.fg.brightGreen,
  miss: ansi.fg.brightBlack,
};

const FEEDBACK_TEXT: Record<string, string> = {
  perfect: "PERFECT!",
  good: "GOOD",
  miss: "MISS",
};

function renderFeedback(row: number, cols: number, extras: FrameExtras): void {
  blankRow(row, cols);
  if (!extras.feedback) return;

  const color = FEEDBACK_COLORS[extras.feedback] ?? ansi.reset;
  const text = FEEDBACK_TEXT[extras.feedback] ?? "";
  const col = laneCol(extras.feedbackLane, cols);
  writeAt(row, col, `${color}${ansi.bold}${text}${ansi.reset}`);
}
