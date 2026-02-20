/**
 * VibeBlock post-game results screen.
 * Shown in normal terminal mode after the alt screen exits.
 */

import { GameState } from "./state";

const E = "\x1b";
const RST = E + "[0m";
const BOLD = E + "[1m";
const DIM = E + "[2m";
const CYAN = E + "[38;2;0;255;255m";
const MAG = E + "[38;2;255;0;255m";
const YELLOW = E + "[38;2;230;255;0m";
const GREEN = E + "[38;2;57;255;20m";
const ORANGE = E + "[38;2;255;102;0m";
const RED_COL = E + "[38;2;255;80;80m";

const W = 42; // box inner width (including padding)

function getMargin(): string {
  const cols = process.stdout.columns ?? 80;
  return " ".repeat(Math.max(0, Math.floor((cols - W) / 2)));
}

function border(margin: string): string {
  return margin + CYAN + BOLD + "+" + "=".repeat(W - 2) + "+" + RST;
}
function blank(margin: string): string {
  return (
    margin +
    CYAN +
    BOLD +
    "|" +
    RST +
    " ".repeat(W - 2) +
    CYAN +
    BOLD +
    "|" +
    RST
  );
}

function mRow(margin: string, label: string, rawValue: string): string {
  const visibleValue = rawValue.replace(/\x1b\[[0-9;]*m/g, "");
  const content = "  " + label.padEnd(16) + " " + rawValue;
  const visibleLen = 2 + 16 + 1 + visibleValue.length;
  const pad = Math.max(0, W - 2 - visibleLen);
  return (
    margin +
    CYAN +
    BOLD +
    "|" +
    RST +
    content +
    " ".repeat(pad) +
    CYAN +
    BOLD +
    "|" +
    RST
  );
}

export async function showResults(
  state: GameState,
  claudeOutput: string,
): Promise<void> {
  const m = getMargin();
  const grade = letterGrade(state);
  const gradeColor = gradeToColor(grade);
  const reason = formatReason(state.clearReason);
  const [singles, doubles, triples, quads] = state.lineClearBreakdown;

  const headerText = "  > VIBEBLOCK // RUN COMPLETE";
  const headerPad = W - 2 - headerText.length;

  const lines = [
    "",
    border(m),
    m +
      CYAN +
      BOLD +
      "|" +
      RST +
      BOLD +
      MAG +
      headerText +
      RST +
      " ".repeat(Math.max(0, headerPad)) +
      CYAN +
      BOLD +
      "|" +
      RST,
    border(m),
    blank(m),
    mRow(m, "REASON:", reason),
    blank(m),
    mRow(m, "SCORE:", BOLD + YELLOW + state.score.toLocaleString() + RST),
    mRow(m, "GRADE:", BOLD + gradeColor + grade + RST),
    mRow(m, "LEVEL:", CYAN + String(state.level) + RST),
    mRow(m, "LINES:", MAG + String(state.linesCleared) + RST),
    blank(m),
    mRow(m, "SINGLES:", DIM + String(singles) + RST),
    mRow(m, "DOUBLES:", DIM + String(doubles) + RST),
    mRow(m, "TRIPLES:", CYAN + String(triples) + RST),
    mRow(m, "QUADS:", YELLOW + BOLD + String(quads) + RST),
    blank(m),
    mRow(m, "CLAUDE TIME:", DIM + state.elapsedFormatted + RST),
    blank(m),
    border(m),
    "",
  ];

  process.stdout.write(lines.join("\n") + "\n");

  if (claudeOutput.trim()) {
    process.stdout.write(
      m + DIM + "--- claude output " + "-".repeat(24) + RST + "\n",
    );
    process.stdout.write(claudeOutput);
    if (!claudeOutput.endsWith("\n")) process.stdout.write("\n");
    process.stdout.write(m + DIM + "-".repeat(42) + RST + "\n");
  }

  const ctrlLine =
    m +
    "  " +
    DIM +
    "[ENTER]" +
    RST +
    " Back to lobby   " +
    RED_COL +
    BOLD +
    "[Q]" +
    RST +
    " Close window\n\n";
  process.stdout.write(ctrlLine);

  await waitForKey();
}

function formatReason(reason: GameState["clearReason"]): string {
  switch (reason) {
    case "board-full":
      return RED_COL + BOLD + "BOARD OVERFLOW" + RST;
    case "claude-done":
      return GREEN + BOLD + "NEURAL SYNC COMPLETE" + RST;
    case "quit":
      return ORANGE + "OPERATOR EXIT" + RST;
    default:
      return DIM + "UNKNOWN" + RST;
  }
}

function letterGrade(state: GameState): string {
  if (state.linesCleared === 0) return "D";
  const ratio = state.score / Math.max(1, state.elapsedMs / 1000);
  if (state.lineClearBreakdown[3] >= 3) return "S"; // 3+ quad clears
  if (ratio >= 500) return "S";
  if (ratio >= 200) return "A";
  if (ratio >= 80) return "B";
  if (ratio >= 30) return "C";
  return "D";
}

function gradeToColor(grade: string): string {
  switch (grade) {
    case "S":
      return E + "[38;2;230;255;0m";
    case "A":
      return E + "[38;2;57;255;20m";
    case "B":
      return E + "[38;2;0;255;255m";
    case "C":
      return E + "[38;2;255;105;180m";
    default:
      return E + "[38;2;255;80;80m";
  }
}

function waitForKey(): Promise<void> {
  return new Promise((resolve) => {
    let rawOn = false;
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
        rawOn = true;
      } catch (_) {}
    }
    process.stdin.resume();

    const handler = (chunk: Buffer) => {
      const ch = chunk.toString("utf-8");
      process.stdin.removeListener("data", handler);
      if (rawOn) {
        try {
          process.stdin.setRawMode(false);
        } catch (_) {}
      }
      process.stdin.pause();
      if (ch === "q" || ch === "Q" || ch === "\x03" || ch === "\x04") {
        process.exit(0);
      }
      resolve();
    };

    process.stdin.on("data", handler);
  });
}
