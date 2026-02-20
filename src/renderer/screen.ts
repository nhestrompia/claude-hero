/**
 * Raw terminal controller using ANSI escape sequences.
 * Manages alternate screen buffer, cursor visibility, and raw mode.
 * Zero external dependencies.
 */

// ANSI escape helpers
export const ESC = "\x1b";
export const CSI = `${ESC}[`;

export const ansi = {
  // Screen management
  enterAltScreen: `${CSI}?1049h`,
  exitAltScreen: `${CSI}?1049l`,
  clearScreen: `${CSI}2J`,
  clearLine: `${CSI}2K`,

  // Cursor
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,
  cursorHome: `${CSI}H`,
  moveTo: (row: number, col: number) => `${CSI}${row};${col}H`,

  // Colors (foreground)
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  fg: {
    black: `${CSI}30m`,
    red: `${CSI}31m`,
    green: `${CSI}32m`,
    yellow: `${CSI}33m`,
    blue: `${CSI}34m`,
    magenta: `${CSI}35m`,
    cyan: `${CSI}36m`,
    white: `${CSI}37m`,
    brightBlack: `${CSI}90m`,
    brightRed: `${CSI}91m`,
    brightGreen: `${CSI}92m`,
    brightYellow: `${CSI}93m`,
    brightBlue: `${CSI}94m`,
    brightMagenta: `${CSI}95m`,
    brightCyan: `${CSI}96m`,
    brightWhite: `${CSI}97m`,
  },
  bg: {
    black: `${CSI}40m`,
    red: `${CSI}41m`,
    green: `${CSI}42m`,
    yellow: `${CSI}43m`,
    blue: `${CSI}44m`,
    magenta: `${CSI}45m`,
    cyan: `${CSI}46m`,
    white: `${CSI}47m`,
    brightBlack: `${CSI}100m`,
    brightGreen: `${CSI}102m`,
    brightYellow: `${CSI}103m`,
    brightBlue: `${CSI}104m`,
    brightWhite: `${CSI}107m`,
  },
};

// ── Cyberpunk neon palette (true-color) ────────────────────────────────────
export const NEON = {
  cyan: "\x1b[38;2;0;255;255m",
  magenta: "\x1b[38;2;255;0;255m",
  pink: "\x1b[38;2;255;105;180m",
  green: "\x1b[38;2;57;255;20m",
  yellow: "\x1b[38;2;230;255;0m",
  orange: "\x1b[38;2;255;102;0m",
  blue: "\x1b[38;2;125;149;255m",
  // dim variants for borders / accents
  dimCyan: "\x1b[38;2;0;140;140m",
  dimMagenta: "\x1b[38;2;140;0;140m",
};

export const BG_DARK = "\x1b[48;2;8;4;20m"; // deep purple-black
export const BG_CELL = "\x1b[48;2;18;12;36m"; // slightly lighter empty cell

let rawModeActive = false;
let altScreenActive = false;

/** Enter alternate screen buffer and enable raw keyboard input. */
export function enterGameMode(): void {
  if (!process.stdout.isTTY) return;

  process.stdout.write(ansi.enterAltScreen);
  process.stdout.write(ansi.hideCursor);
  process.stdout.write(ansi.clearScreen);
  altScreenActive = true;

  if (process.stdin.isTTY && !rawModeActive) {
    process.stdin.setRawMode(true);
    rawModeActive = true;
  }
  process.stdin.resume();
}

/** Restore the terminal to its previous state. */
export function exitGameMode(): void {
  if (rawModeActive) {
    try {
      process.stdin.setRawMode(false);
    } catch (_) {
      /* ignore */
    }
    rawModeActive = false;
  }

  if (altScreenActive) {
    process.stdout.write(ansi.showCursor);
    process.stdout.write(ansi.exitAltScreen);
    altScreenActive = false;
  }
}

/** Get current terminal dimensions. */
export function getTermSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}

/**
 * Write a string to stdout at a specific (1-based) row/col position.
 * All rendering goes through here to allow future buffering.
 */
export function writeAt(row: number, col: number, text: string): void {
  process.stdout.write(ansi.moveTo(row, col) + text);
}

/** Clear a specific row. */
export function clearRow(row: number): void {
  process.stdout.write(ansi.moveTo(row, 1) + ansi.clearLine);
}

/** Write a full-width blank row (for erasing previous frame content). */
export function blankRow(row: number, cols: number): void {
  process.stdout.write(ansi.moveTo(row, 1) + " ".repeat(cols));
}
