/**
 * Scoring formulas for VibeBlock.
 */

/** Points awarded for clearing N lines at the current level. */
export function calculateLineClearScore(lines: number, level: number): number {
  const BASE: Record<number, number> = { 1: 100, 2: 300, 3: 500, 4: 800 };
  return (BASE[lines] ?? 0) * level;
}

/** Gravity drop interval in ms for the given level. Floors at 80ms. */
export function getDropInterval(level: number): number {
  return Math.max(80, 500 - (level - 1) * 55);
}

/** Level derived from total lines cleared (levels up every 10 lines). */
export function getLevel(
  totalLinesCleared: number,
  startingLevel: number,
): number {
  return startingLevel + Math.floor(totalLinesCleared / 10);
}
