/**
 * Board — pure functions for collision detection, placement, and line clearing.
 */

import { PieceDef } from "./pieces";

export const BOARD_COLS = 12;
export const BOARD_ROWS = 18; // visible rows
export const BUFFER_ROWS = 2; // hidden rows at the top (spawn area)
export const TOTAL_ROWS = BOARD_ROWS + BUFFER_ROWS; // 20
export const SPAWN_X = Math.floor((BOARD_COLS - 4) / 2); // 4

/** Each cell is null (empty) or a bgColor ANSI string (filled). */
export type Board = (string | null)[][];

export function createEmptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () =>
    Array<string | null>(BOARD_COLS).fill(null),
  );
}

/**
 * Returns true if the piece can be placed at (x, y) with the given rotation.
 * Cells above row 0 are allowed (spawning off-top).
 */
export function canPlace(
  board: Board,
  def: PieceDef,
  rotation: number,
  x: number,
  y: number,
): boolean {
  const cells = def.rotations[rotation];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!cells[r][c]) continue;
      const boardRow = y + r;
      const boardCol = x + c;
      if (boardCol < 0 || boardCol >= BOARD_COLS) return false;
      if (boardRow >= TOTAL_ROWS) return false;
      if (boardRow < 0) continue; // above board is fine while spawning
      if (board[boardRow][boardCol] !== null) return false;
    }
  }
  return true;
}

/** Write a piece onto the board (mutates in place). */
export function placePiece(
  board: Board,
  def: PieceDef,
  rotation: number,
  x: number,
  y: number,
): void {
  const cells = def.rotations[rotation];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!cells[r][c]) continue;
      const boardRow = y + r;
      const boardCol = x + c;
      if (boardRow < 0 || boardRow >= TOTAL_ROWS) continue;
      board[boardRow][boardCol] = def.color; // store fg so ██ inherits correct neon color
    }
  }
}

/**
 * Remove full rows. Returns [newBoard, clearedCount].
 * Empty rows are prepended to maintain board height.
 */
export function clearLines(board: Board): [Board, number] {
  const kept: (string | null)[][] = [];
  let cleared = 0;

  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (board[r].every((cell) => cell !== null)) {
      cleared++;
    } else {
      kept.push(board[r]);
    }
  }

  const newBoard: Board = [
    ...Array.from({ length: cleared }, () =>
      Array<string | null>(BOARD_COLS).fill(null),
    ),
    ...kept,
  ];

  return [newBoard, cleared];
}

/** Y coordinate where the piece would land if hard-dropped. */
export function getGhostY(
  board: Board,
  def: PieceDef,
  rotation: number,
  x: number,
  y: number,
): number {
  let ghostY = y;
  while (canPlace(board, def, rotation, x, ghostY + 1)) {
    ghostY++;
  }
  return ghostY;
}

/** True when any cell in the hidden buffer rows is occupied → board overflow. */
export function isGameOver(board: Board): boolean {
  for (let r = 0; r < BUFFER_ROWS; r++) {
    if (board[r].some((cell) => cell !== null)) return true;
  }
  return false;
}
