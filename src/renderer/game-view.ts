/**
 * VibeBlock cyberpunk frame renderer.
 * All coordinates: board rows 0–TOTAL_ROWS-1, first BUFFER_ROWS are hidden.
 * Terminal rows/cols: 1-based.
 */

import { isSoundEnabled } from "../audio/sfx";
import { BOARD_COLS, BOARD_ROWS, BUFFER_ROWS, getGhostY } from "../game/board";
import { PIECE_DEFS, PieceType } from "../game/pieces";
import { GameState } from "../game/state";
import { BG_CELL, getTermSize, NEON, writeAt } from "./screen";

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const E = "\x1b";
const RST = E + "[0m";
const B = E + "[1m";
const DIM = E + "[2m";

const CYAN = NEON.cyan;
const MAG = NEON.magenta;
const GREEN = NEON.green;
const YELLOW = NEON.yellow;
const DCYAN = NEON.dimCyan;
const DMAG = NEON.dimMagenta;

// ── Layout (computed each frame from terminal size) ───────────────────────────
const CELL_W = 2;
const BOARD_PX = 1 + BOARD_COLS * CELL_W + 1; // ╔ + cells + ╗  = 26
const PANEL_W = 14; // right panel visible chars
const GAP = 2;
const TOTAL_W = BOARD_PX + GAP + PANEL_W; // ~42

function layout() {
  const { cols, rows } = getTermSize();
  const boardStartCol = Math.max(1, Math.floor((cols - TOTAL_W) / 2) + 1);
  const boardStartRow = Math.max(
    3,
    Math.floor((rows - BOARD_ROWS - 4) / 2) + 2,
  );
  const panelCol = boardStartCol + BOARD_PX + GAP;
  return { boardStartCol, boardStartRow, panelCol, termCols: cols };
}

// ── Public entry ──────────────────────────────────────────────────────────────

export function renderFrame(state: GameState): void {
  const L = layout();
  renderTitleBar(state, L.termCols);
  renderBoard(state, L.boardStartRow, L.boardStartCol);
  renderRightPanel(state, L.boardStartRow, L.panelCol);
  renderHintBar(state, L.boardStartRow, L.termCols);
  if (state.isPaused) renderPauseOverlay(L.boardStartRow, L.boardStartCol);
}

// ── Title bar ─────────────────────────────────────────────────────────────────

function renderTitleBar(state: GameState, termCols: number): void {
  const soundStr = isSoundEnabled()
    ? NEON.green + B + "[M] ♪ ON " + RST
    : DIM + "[M] ♪ OFF" + RST;

  const claudeStr = claudeIcon(state);

  const title =
    B +
    MAG +
    "▸ VIBEBLOCK " +
    RST +
    DCYAN +
    "▸ " +
    RST +
    claudeStr +
    "  " +
    DIM +
    state.elapsedFormatted +
    RST +
    "  " +
    soundStr;

  writeAt(1, 1, title + RST + E + "[K");
}

function claudeIcon(s: GameState): string {
  switch (s.claudeState) {
    case "running":
      return CYAN + B + "◌ SYNCING..." + RST;
    case "done":
      return GREEN + B + "● DONE     " + RST;
    default:
      return DIM + "○ IDLE     " + RST;
  }
}

// ── Board ─────────────────────────────────────────────────────────────────────

function renderBoard(
  state: GameState,
  startRow: number,
  startCol: number,
): void {
  const {
    board,
    currentPiece,
    currentX,
    currentY,
    currentRotation,
    glitchFrames,
    gameOver,
  } = state;

  const def = PIECE_DEFS[currentPiece];
  const pieceColor = def.color;
  const matrix = def.rotations[currentRotation];

  // Build sets of VISIBLE rows (0 = top visible row = board row BUFFER_ROWS)
  const activeCells = new Map<string, string>(); // key → fgColor
  const ghostCells = new Set<string>();

  if (!gameOver) {
    const ghostY = getGhostY(board, def, currentRotation, currentX, currentY);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!matrix[r][c]) continue;

        // Ghost (only where different from active)
        const gBoardRow = ghostY + r;
        const gVisRow = gBoardRow - BUFFER_ROWS;
        if (
          gBoardRow !== currentY + r &&
          gVisRow >= 0 &&
          gVisRow < BOARD_ROWS
        ) {
          ghostCells.add(`${gVisRow},${currentX + c}`);
        }

        // Active piece — convert board row → visible row
        const aBoardRow = currentY + r;
        const aVisRow = aBoardRow - BUFFER_ROWS;
        if (aVisRow >= 0 && aVisRow < BOARD_ROWS) {
          activeCells.set(`${aVisRow},${currentX + c}`, pieceColor); // fg
        }
      }
    }
  }

  // Top border
  writeAt(
    startRow - 1,
    startCol,
    DCYAN + "╔" + "══".repeat(BOARD_COLS) + "╗" + RST,
  );

  for (let vRow = 0; vRow < BOARD_ROWS; vRow++) {
    const termRow = startRow + vRow;
    const boardRow = vRow + BUFFER_ROWS; // absolute board row

    let line = DCYAN + "║" + RST;
    const glitch = glitchFrames > 0 && Math.random() < 0.25;

    for (let col = 0; col < BOARD_COLS; col++) {
      const key = `${vRow},${col}`;
      const cell = board[boardRow]?.[col] ?? null; // locked cell bg color

      if (activeCells.has(key)) {
        // Active falling piece
        line += (activeCells.get(key) as string) + B + "██" + RST;
      } else if (ghostCells.has(key) && cell === null) {
        // Ghost shadow (only on empty cells)
        line += DIM + DCYAN + "░░" + RST;
      } else if (cell !== null) {
        // Locked board cell
        if (glitch && Math.random() < 0.4) {
          line += MAG + B + "▓▓" + RST;
        } else {
          line += cell + B + "██" + RST;
        }
      } else {
        // Empty
        line += BG_CELL + DIM + "· " + RST;
      }
    }

    line += DCYAN + "║" + RST;
    writeAt(termRow, startCol, line);
  }

  // Bottom border
  writeAt(
    startRow + BOARD_ROWS,
    startCol,
    DCYAN + "╚" + "══".repeat(BOARD_COLS) + "╝" + RST,
  );
}

// ── Right panel ───────────────────────────────────────────────────────────────

function renderRightPanel(
  state: GameState,
  startRow: number,
  panelCol: number,
): void {
  let row = startRow - 1;

  row = renderMiniPiece(row, "NEXT", state.nextPiece, panelCol);
  row = renderMiniPiece(
    row + 1,
    "HOLD",
    state.holdUsed ? null : state.heldPiece,
    panelCol,
  );

  row++;
  writeAt(row++, panelCol, CYAN + B + "SCORE" + RST);
  writeAt(row++, panelCol, YELLOW + B + state.score.toLocaleString() + RST);
  row++;
  writeAt(row++, panelCol, CYAN + B + "LEVEL" + RST);
  writeAt(row++, panelCol, NEON.pink + B + String(state.level) + RST);
  row++;
  writeAt(row++, panelCol, CYAN + B + "LINES" + RST);
  writeAt(row++, panelCol, MAG + B + String(state.linesCleared) + RST);

  row++;
  const [s1, s2, s3, s4] = state.lineClearBreakdown;
  writeAt(row++, panelCol, DIM + `S: ${s1}` + RST);
  writeAt(row++, panelCol, DIM + `D: ${s2}` + RST);
  writeAt(row++, panelCol, DIM + `T: ${s3}` + RST);
  writeAt(row++, panelCol, YELLOW + DIM + `Q: ${s4}` + RST);
}

function renderMiniPiece(
  startRow: number,
  label: string,
  piece: PieceType | null,
  panelCol: number,
): number {
  let row = startRow;
  writeAt(row++, panelCol, DCYAN + label + ":" + RST);
  writeAt(row++, panelCol, DMAG + "┌────────┐" + RST);

  const matrix = piece ? PIECE_DEFS[piece].rotations[0] : null;
  const pColor = piece ? PIECE_DEFS[piece].color : null;

  for (let r = 0; r < 4; r++) {
    let line = DMAG + "│" + RST;
    for (let c = 0; c < 4; c++) {
      if (matrix && matrix[r][c] && pColor) {
        line += pColor + B + "██" + RST;
      } else {
        line += BG_CELL + DIM + "· " + RST;
      }
    }
    line += DMAG + "│" + RST;
    writeAt(row++, panelCol, line);
  }
  writeAt(row++, panelCol, DMAG + "└────────┘" + RST);
  return row;
}

// ── Pause overlay ─────────────────────────────────────────────────────────────

function renderPauseOverlay(startRow: number, startCol: number): void {
  const mid = startRow + Math.floor(BOARD_ROWS / 2) - 1;
  const midCol = startCol + Math.floor((BOARD_COLS * CELL_W - 16) / 2);
  writeAt(mid, midCol, MAG + B + "╔══════════════╗" + RST);
  writeAt(mid + 1, midCol, MAG + B + "║  ⟐ PAUSED ⟐  ║" + RST);
  writeAt(mid + 2, midCol, MAG + B + "╚══════════════╝" + RST);
}

// ── Hint bar ──────────────────────────────────────────────────────────────────

function renderHintBar(
  state: GameState,
  startRow: number,
  termCols: number,
): void {
  const hintRow = startRow + BOARD_ROWS + 2;
  const hint =
    "[W]ROT [A][D]MOVE [S]DROP [SPC]HARD [E]HOLD [P]PAUSE [M]SFX [Q]QUIT";
  const pad = Math.max(0, Math.floor((termCols - hint.length) / 2));
  writeAt(hintRow, 1, " ".repeat(pad) + DIM + hint + RST + E + "[K");
}
