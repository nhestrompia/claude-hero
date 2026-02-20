/**
 * Block piece definitions — 7 shapes with 4 rotations each.
 * Rotations stored as 4×4 boolean grids (row-major).
 * Colors use true-color ANSI — cyberpunk neon palette.
 */

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface PieceDef {
  type: PieceType;
  color: string; // ANSI fg (used for ghost + text)
  bgColor: string; // ANSI bg (used for filled cells)
  rotations: boolean[][][]; // [rotation][row][col], 4×4 grid
}

// True-color ANSI helpers (exported for renderers)
export const rgb = (r: number, g: number, b: number): string =>
  `\x1b[38;2;${r};${g};${b}m`;
export const bgRgb = (r: number, g: number, b: number): string =>
  `\x1b[48;2;${r};${g};${b}m`;

// ── Cyberpunk Neon Palette ────────────────────────────────────────────────────
const COLORS: Record<PieceType, [number, number, number]> = {
  I: [0, 255, 255], // electric cyan
  O: [230, 255, 0], // neon yellow
  T: [255, 0, 255], // neon magenta
  S: [255, 105, 180], // hot pink
  Z: [255, 102, 0], // neon orange
  L: [125, 149, 255], // electric blue
  J: [57, 255, 20], // acid green
};

function makeColor(type: PieceType): { color: string; bgColor: string } {
  const [r, g, b] = COLORS[type];
  return { color: rgb(r, g, b), bgColor: bgRgb(r, g, b) };
}

// ── Piece shape rotations ─────────────────────────────────────────────────────

const I_ROTS: boolean[][][] = [
  [
    [false, false, false, false],
    [true, true, true, true],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [
    [false, false, true, false],
    [false, false, true, false],
    [false, false, true, false],
    [false, false, true, false],
  ],
  [
    [false, false, false, false],
    [false, false, false, false],
    [true, true, true, true],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [false, true, false, false],
    [false, true, false, false],
    [false, true, false, false],
  ],
];

const O_ROT: boolean[][] = [
  [false, true, true, false],
  [false, true, true, false],
  [false, false, false, false],
  [false, false, false, false],
];
const O_ROTS: boolean[][][] = [O_ROT, O_ROT, O_ROT, O_ROT];

const T_ROTS: boolean[][][] = [
  [
    [false, true, false, false],
    [true, true, true, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [false, true, true, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
  [
    [false, false, false, false],
    [true, true, true, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [true, true, false, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
];

const S_ROTS: boolean[][][] = [
  [
    [false, true, true, false],
    [true, true, false, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [false, true, true, false],
    [false, false, true, false],
    [false, false, false, false],
  ],
  [
    [false, false, false, false],
    [false, true, true, false],
    [true, true, false, false],
    [false, false, false, false],
  ],
  [
    [true, false, false, false],
    [true, true, false, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
];

const Z_ROTS: boolean[][][] = [
  [
    [true, true, false, false],
    [false, true, true, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [
    [false, false, true, false],
    [false, true, true, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
  [
    [false, false, false, false],
    [true, true, false, false],
    [false, true, true, false],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [true, true, false, false],
    [true, false, false, false],
    [false, false, false, false],
  ],
];

const J_ROTS: boolean[][][] = [
  [
    [true, false, false, false],
    [true, true, true, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [
    [false, true, true, false],
    [false, true, false, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
  [
    [false, false, false, false],
    [true, true, true, false],
    [false, false, true, false],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [false, true, false, false],
    [true, true, false, false],
    [false, false, false, false],
  ],
];

const L_ROTS: boolean[][][] = [
  [
    [false, false, true, false],
    [true, true, true, false],
    [false, false, false, false],
    [false, false, false, false],
  ],
  [
    [false, true, false, false],
    [false, true, false, false],
    [false, true, true, false],
    [false, false, false, false],
  ],
  [
    [false, false, false, false],
    [true, true, true, false],
    [true, false, false, false],
    [false, false, false, false],
  ],
  [
    [true, true, false, false],
    [false, true, false, false],
    [false, true, false, false],
    [false, false, false, false],
  ],
];

// ── Piece registry ────────────────────────────────────────────────────────────
export const PIECE_DEFS: Record<PieceType, PieceDef> = {
  I: { type: "I", ...makeColor("I"), rotations: I_ROTS },
  O: { type: "O", ...makeColor("O"), rotations: O_ROTS },
  T: { type: "T", ...makeColor("T"), rotations: T_ROTS },
  S: { type: "S", ...makeColor("S"), rotations: S_ROTS },
  Z: { type: "Z", ...makeColor("Z"), rotations: Z_ROTS },
  J: { type: "J", ...makeColor("J"), rotations: J_ROTS },
  L: { type: "L", ...makeColor("L"), rotations: L_ROTS },
};

const ALL_TYPES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

// ── 7-bag randomizer ──────────────────────────────────────────────────────────
let bag: PieceType[] = [];

function refillBag(): void {
  bag = [...ALL_TYPES];
  // Fisher-Yates shuffle
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

export function getNextPieceType(): PieceType {
  if (bag.length === 0) refillBag();
  return bag.pop()!;
}
