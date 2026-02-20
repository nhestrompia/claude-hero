/**
 * User and gravity action handlers — mutate GameState in place.
 */

import {
  canPlace,
  clearLines,
  getGhostY,
  isGameOver,
  placePiece,
  SPAWN_X,
} from "./board";
import { getNextPieceType, PIECE_DEFS } from "./pieces";
import { calculateLineClearScore, getDropInterval, getLevel } from "./scoring";
import { GameState } from "./state";

export function moveLeft(state: GameState): void {
  if (state.isPaused || state.gameOver) return;
  const def = PIECE_DEFS[state.currentPiece];
  if (
    canPlace(
      state.board,
      def,
      state.currentRotation,
      state.currentX - 1,
      state.currentY,
    )
  ) {
    state.currentX--;
  }
}

export function moveRight(state: GameState): void {
  if (state.isPaused || state.gameOver) return;
  const def = PIECE_DEFS[state.currentPiece];
  if (
    canPlace(
      state.board,
      def,
      state.currentRotation,
      state.currentX + 1,
      state.currentY,
    )
  ) {
    state.currentX++;
  }
}

export function rotate(state: GameState): void {
  if (state.isPaused || state.gameOver) return;
  const def = PIECE_DEFS[state.currentPiece];
  const newRot = ((state.currentRotation + 1) % 4) as 0 | 1 | 2 | 3;

  // Wall-kick candidates: try principle position first, then offsets
  const kicks: [number, number][] = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
  ];

  for (const [dx, dy] of kicks) {
    if (
      canPlace(
        state.board,
        def,
        newRot,
        state.currentX + dx,
        state.currentY + dy,
      )
    ) {
      state.currentRotation = newRot;
      state.currentX += dx;
      state.currentY += dy;
      return;
    }
  }
}

export function softDrop(state: GameState, now: number): void {
  if (state.isPaused || state.gameOver) return;
  const def = PIECE_DEFS[state.currentPiece];
  if (
    canPlace(
      state.board,
      def,
      state.currentRotation,
      state.currentX,
      state.currentY + 1,
    )
  ) {
    state.currentY++;
    state.score += 1;
    state.lastDropTime = now; // reset gravity timer
  } else {
    lockPiece(state);
  }
}

export function hardDrop(state: GameState): void {
  if (state.isPaused || state.gameOver) return;
  const def = PIECE_DEFS[state.currentPiece];
  const ghostY = getGhostY(
    state.board,
    def,
    state.currentRotation,
    state.currentX,
    state.currentY,
  );
  const distance = ghostY - state.currentY;
  state.currentY = ghostY;
  state.score += distance * 2;
  lockPiece(state);
}

export function hold(state: GameState): void {
  if (state.isPaused || state.gameOver || state.holdUsed) return;
  const current = state.currentPiece;

  if (state.heldPiece === null) {
    state.heldPiece = current;
    state.currentPiece = state.nextPiece;
    state.nextPiece = getNextPieceType();
  } else {
    const prev = state.heldPiece;
    state.heldPiece = current;
    state.currentPiece = prev;
  }

  state.currentX = SPAWN_X;
  state.currentY = 0;
  state.currentRotation = 0;
  state.holdUsed = true;
}

export function togglePause(state: GameState): void {
  if (state.gameOver) return;
  state.isPaused = !state.isPaused;
}

/** Lock the current piece to the board, clear lines, and spawn next. */
export function lockPiece(state: GameState): void {
  const def = PIECE_DEFS[state.currentPiece];
  placePiece(
    state.board,
    def,
    state.currentRotation,
    state.currentX,
    state.currentY,
  );

  const [newBoard, cleared] = clearLines(state.board);
  state.board = newBoard;

  if (cleared > 0) {
    state.score += calculateLineClearScore(cleared, state.level);
    state.linesCleared += cleared;
    state.combo++;
    if (cleared >= 1 && cleared <= 4) {
      state.lineClearBreakdown[cleared - 1]++;
    }
    // Consecutive-clear streak bonus
    if (state.combo > 1) {
      state.score += 50 * state.combo * state.level;
    }
    state.glitchFrames = 5;
    state.pendingLineClear = cleared;
    // Level-up check
    const newLevel = getLevel(state.linesCleared, state.startingLevel);
    if (newLevel !== state.level) {
      state.level = newLevel;
      state.dropInterval = getDropInterval(state.level);
    }
  } else {
    state.combo = 0;
    state.pendingLineClear = 0;
  }

  // Check overflow BEFORE spawning
  if (isGameOver(state.board)) {
    state.gameOver = true;
    state.clearReason = "board-full";
    return;
  }

  // Spawn next piece
  state.currentPiece = state.nextPiece;
  state.nextPiece = getNextPieceType();
  state.currentX = SPAWN_X;
  state.currentY = 0;
  state.currentRotation = 0;
  state.holdUsed = false;

  // Check if spawn position is already blocked
  const newDef = PIECE_DEFS[state.currentPiece];
  if (!canPlace(state.board, newDef, 0, state.currentX, state.currentY)) {
    state.gameOver = true;
    state.clearReason = "board-full";
  }
}

/** Called each frame to apply gravity. */
export function gravityDrop(state: GameState, now: number): void {
  if (state.isPaused || state.gameOver) return;
  if (now - state.lastDropTime < state.dropInterval) return;

  const def = PIECE_DEFS[state.currentPiece];
  if (
    canPlace(
      state.board,
      def,
      state.currentRotation,
      state.currentX,
      state.currentY + 1,
    )
  ) {
    state.currentY++;
  } else {
    lockPiece(state);
  }
  state.lastDropTime = now;
}
