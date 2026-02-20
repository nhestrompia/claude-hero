/**
 * End-of-game results screen — shown after exiting the alt screen buffer.
 */

import { Song } from "../chart/types";
import { accuracy } from "./scoring";
import { GameState } from "./state";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

export function showResults(
  state: GameState,
  song: Song,
  claudeOutput: string,
): void {
  const acc = accuracy(state);
  const grade = letterGrade(acc, state.misses);
  const gradeColor = gradeToColor(grade);

  const lines: string[] = [
    "",
    `${BOLD}${CYAN}╔════════════════════════════════╗${RESET}`,
    `${BOLD}${CYAN}║       CLAUDE HERO — RESULTS    ║${RESET}`,
    `${BOLD}${CYAN}╚════════════════════════════════╝${RESET}`,
    "",
    `  Song:      ${BOLD}${song.metadata.name}${RESET}  ${DIM}by ${song.metadata.artist}${RESET}`,
    "",
    `  Score:     ${BOLD}${YELLOW}${state.score.toLocaleString()}${RESET}`,
    `  Grade:     ${BOLD}${gradeColor}${grade}${RESET}`,
    `  Accuracy:  ${acc}%`,
    "",
    `  Perfect:   ${GREEN}${state.perfects}${RESET}`,
    `  Good:      ${YELLOW}${state.goods}${RESET}`,
    `  Miss:      ${RED}${state.misses}${RESET}`,
    `  Max Combo: ${CYAN}${state.maxCombo}x${RESET}`,
    "",
    `  Claude time: ${state.elapsedFormatted}`,
    "",
  ];

  process.stdout.write(lines.join("\n") + "\n");

  if (claudeOutput.trim()) {
    process.stdout.write(
      `${DIM}─── Claude output ───────────────────────────────────────${RESET}\n`,
    );
    process.stdout.write(claudeOutput);
    if (!claudeOutput.endsWith("\n")) process.stdout.write("\n");
    process.stdout.write(
      `${DIM}─────────────────────────────────────────────────────────${RESET}\n`,
    );
  }

  process.stdout.write("\n");
}

function letterGrade(acc: number, misses: number): string {
  if (misses === 0 && acc === 100) return "FC"; // Full Combo
  if (acc >= 95) return "S";
  if (acc >= 85) return "A";
  if (acc >= 75) return "B";
  if (acc >= 60) return "C";
  return "D";
}

function gradeToColor(grade: string): string {
  switch (grade) {
    case "FC":
      return "\x1b[35m"; // Magenta
    case "S":
      return "\x1b[33m"; // Yellow
    case "A":
      return "\x1b[32m"; // Green
    case "B":
      return "\x1b[36m"; // Cyan
    default:
      return "\x1b[0m";
  }
}
