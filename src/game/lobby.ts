/**
 * Lobby — shown between games when the terminal stays open.
 *
 * Writes a PID file so on-prompt.sh can detect the open window and
 * trigger a new game without spawning another terminal.
 *
 * Trigger protocol:
 *   on-prompt.sh writes  /tmp/claude-hero-trigger.json
 *     {"statusFile": "/tmp/claude-hero-<id>.json", "timestamp": <epochMs>}
 *   The lobby reads it, deletes it, and returns the statusFile path.
 *   If the user presses Q / Ctrl+C first, returns null.
 */

import * as fs from "fs";

const LOBBY_FILE = "/tmp/claude-hero-lobby.json";
const TRIGGER_FILE = "/tmp/claude-hero-trigger.json";
const POLL_MS = 300;

// ANSI helpers (inline to avoid importing the full screen module in raw mode)
const CSI = "\x1b[";
const RESET = `${CSI}0m`;
const BOLD = `${CSI}1m`;
const DIM = `${CSI}2m`;
const CYAN = `${CSI}36m`;
const BBLACK = `${CSI}90m`;
const YELLOW = `${CSI}93m`;

export interface Trigger {
  statusFile: string;
}

/**
 * Enter lobby mode: write PID file, show waiting screen, poll for trigger.
 * Returns Trigger when a new prompt arrives, or null when user quits.
 */
export async function enterLobby(): Promise<Trigger | null> {
  writeLobbyFile();

  process.stdout.write("\n");
  process.stdout.write(
    `${BOLD}${CYAN}╔══════════════════════════════════════╗${RESET}\n`,
  );
  process.stdout.write(
    `${BOLD}${CYAN}║  🎸  CLAUDE HERO  —  LOBBY           ║${RESET}\n`,
  );
  process.stdout.write(
    `${BOLD}${CYAN}╚══════════════════════════════════════╝${RESET}\n`,
  );
  process.stdout.write("\n");
  process.stdout.write(
    `${DIM}${BBLACK}  This window will automatically restart when you send\n`,
  );
  process.stdout.write(`  the next prompt to Claude Code.\n${RESET}`);
  process.stdout.write("\n");
  process.stdout.write(`  ${YELLOW}Press Q to close this window.${RESET}\n`);
  process.stdout.write("\n");

  return new Promise((resolve) => {
    let resolved = false;

    // Poll for trigger file
    const interval = setInterval(() => {
      if (resolved) return;
      const trigger = readTrigger();
      if (trigger) {
        done(trigger);
      }
    }, POLL_MS);

    // Keyboard — raw mode was already exited after results screen.
    // Re-enable raw mode briefly to catch Q.
    let rawOn = false;
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
        rawOn = true;
      } catch (_) {}
    }
    process.stdin.resume();

    const onKey = (chunk: Buffer) => {
      const ch = chunk.toString("utf-8");
      if (ch === "q" || ch === "Q" || ch === "\x03" || ch === "\x04") {
        done(null);
      }
    };
    process.stdin.on("data", onKey);

    function done(result: Trigger | null) {
      if (resolved) return;
      resolved = true;
      clearInterval(interval);
      process.stdin.removeListener("data", onKey);
      if (rawOn) {
        try {
          process.stdin.setRawMode(false);
        } catch (_) {}
      }
      deleteLobbyFile();
      resolve(result);
    }
  });
}

// ---------------------------------------------------------------------------

function writeLobbyFile(): void {
  try {
    fs.writeFileSync(LOBBY_FILE, JSON.stringify({ pid: process.pid }));
  } catch (_) {}
}

function deleteLobbyFile(): void {
  try {
    fs.unlinkSync(LOBBY_FILE);
  } catch (_) {}
}

function readTrigger(): Trigger | null {
  try {
    if (!fs.existsSync(TRIGGER_FILE)) return null;
    const raw = fs.readFileSync(TRIGGER_FILE, "utf-8");
    const obj = JSON.parse(raw) as { statusFile?: string; timestamp?: number };
    if (!obj.statusFile) return null;
    // Consume it immediately so we don't double-trigger
    try {
      fs.unlinkSync(TRIGGER_FILE);
    } catch (_) {}
    return { statusFile: obj.statusFile };
  } catch (_) {
    return null;
  }
}

/** Clean up lobby file on unexpected termination. */
export function registerLobbyCleanup(): void {
  const cleanup = () => {
    deleteLobbyFile();
  };
  process.on("exit", cleanup);
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });
}
