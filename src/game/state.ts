/**
 * VibeBlock central game state.
 */

import { ClaudeState } from "../claude-runner";
import { BOARD_COLS, Board, createEmptyBoard } from "./board";
import { PieceType, getNextPieceType } from "./pieces";
import { getDropInterval } from "./scoring";

export type ClearReason = "board-full" | "claude-done" | "quit" | null;

export interface GameState {
  // ── Board / piece ─────────────────────────────────────────────────────────
  board: Board;
  currentPiece: PieceType;
  currentX: number;
  currentY: number;
  currentRotation: number;
  nextPiece: PieceType;
  heldPiece: PieceType | null;
  holdUsed: boolean; // can only hold once per piece lock

  // ── Scoring ───────────────────────────────────────────────────────────────
  score: number;
  level: number;
  linesCleared: number;
  /** [singles, doubles, triples, quads] */
  lineClearBreakdown: [number, number, number, number];
  combo: number;
  startingLevel: number;

  // ── Control flags ─────────────────────────────────────────────────────────
  isPaused: boolean;
  gameOver: boolean;
  clearReason: ClearReason;
  quitRequested: boolean;
  isRunning: boolean;

  // ── Claude integration ────────────────────────────────────────────────────
  claudeState: ClaudeState;
  autoStopOnClaudeDone: boolean;
  elapsedMs: number;
  elapsedFormatted: string;

  // ── Timing ───────────────────────────────────────────────────────────────
  lastDropTime: number;
  dropInterval: number; // ms per gravity step

  // ── Visual ───────────────────────────────────────────────────────────────
  glitchFrames: number; // frames remaining for line-clear glitch

  // ── Cross-tick signals ────────────────────────────────────────────────────
  /** Set to # lines cleared by lockPiece; consumed and reset by loop. */
  pendingLineClear: number;
}

export function createInitialState(
  startingLevel: number = 1,
  autoStopOnClaudeDone: boolean = false,
): GameState {
  const firstPiece = getNextPieceType();
  const secondPiece = getNextPieceType();
  const spawnX = Math.floor((BOARD_COLS - 4) / 2);

  return {
    board: createEmptyBoard(),
    currentPiece: firstPiece,
    currentX: spawnX,
    currentY: 0,
    currentRotation: 0,
    nextPiece: secondPiece,
    heldPiece: null,
    holdUsed: false,

    score: 0,
    level: startingLevel,
    linesCleared: 0,
    lineClearBreakdown: [0, 0, 0, 0],
    combo: 0,
    startingLevel,

    isPaused: false,
    gameOver: false,
    clearReason: null,
    quitRequested: false,
    isRunning: false,

    claudeState: "idle",
    autoStopOnClaudeDone,
    elapsedMs: 0,
    elapsedFormatted: "0.0s",

    lastDropTime: 0,
    dropInterval: getDropInterval(startingLevel),

    glitchFrames: 0,
    pendingLineClear: 0,
  };
}
