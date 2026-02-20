/**
 * VibeBlock lobby — shown between games when the terminal stays open.
 *
 * Trigger protocol:
 *   on-prompt.sh writes  /tmp/vibeblock-trigger.json
 *     {"statusFile": "/tmp/vibeblock-<id>.json", "timestamp": <epochMs>}
 *   Lobby reads + deletes it, returns the statusFile.
 *   Q / Ctrl+C → returns null (close window).
 */

import * as fs from "fs";
import { loadSettings, saveSettings } from "./settings";

const LOBBY_FILE = "/tmp/vibeblock-lobby.json";
const TRIGGER_FILE = "/tmp/vibeblock-trigger.json";
const POLL_MS = 300;

// ANSI inline helpers
const E = "\x1b";
const RST = E + "[0m";
const B = E + "[1m";
const DIM = E + "[2m";
const CLR = E + "[2J" + E + "[H"; // clear screen + home

const CYAN = E + "[38;2;0;255;255m";
const MAG = E + "[38;2;255;0;255m";
const GREEN = E + "[38;2;57;255;20m";
const YELLOW = E + "[38;2;230;255;0m";
const ORANGE = E + "[38;2;255;102;0m";

export interface Trigger {
  statusFile: string;
}

export async function enterLobby(): Promise<Trigger | null> {
  writeLobbyFile();

  return new Promise((resolve) => {
    let resolved = false;
    let inSettings = false;

    // Poll for trigger file
    const interval = setInterval(() => {
      if (resolved || inSettings) return;
      const t = readTrigger();
      if (t) done(t);
    }, POLL_MS);

    let rawOn = false;
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
        rawOn = true;
      } catch (_) {}
    }
    process.stdin.resume();

    function showLobby() {
      const s = loadSettings();
      process.stdout.write(CLR);
      process.stdout.write("\n");
      process.stdout.write(
        " " + CYAN + B + "+==========================+" + RST + "\n",
      );
      process.stdout.write(
        " " +
          CYAN +
          B +
          "|" +
          RST +
          B +
          MAG +
          "  ▸ VIBEBLOCK            " +
          RST +
          CYAN +
          B +
          "|" +
          RST +
          "\n",
      );
      process.stdout.write(
        " " +
          CYAN +
          B +
          "|" +
          RST +
          DIM +
          "    AWAITING NEURAL LINK  " +
          RST +
          CYAN +
          B +
          "|" +
          RST +
          "\n",
      );
      process.stdout.write(
        " " + CYAN + B + "+==========================+" + RST + "\n",
      );
      process.stdout.write("\n");
      process.stdout.write(
        " " +
          YELLOW +
          B +
          "[S]" +
          RST +
          DIM +
          " Settings  " +
          RST +
          YELLOW +
          B +
          "[Q]" +
          RST +
          DIM +
          " Quit\n" +
          RST,
      );
      process.stdout.write("\n");
      const autoStr = s.autoStopOnClaudeDone
        ? GREEN + "ON" + RST
        : DIM + "OFF" + RST;
      const soundStr = s.soundEnabled ? GREEN + "ON" + RST : DIM + "OFF" + RST;
      process.stdout.write(DIM + "  Auto-stop:     " + RST + autoStr + "\n");
      process.stdout.write(DIM + "  Sound effects: " + RST + soundStr + "\n");
      process.stdout.write(
        DIM +
          "  Start level:   " +
          RST +
          CYAN +
          String(s.startingLevel) +
          RST +
          "\n",
      );
    }

    function showSettings() {
      const s = loadSettings();
      process.stdout.write(CLR);
      process.stdout.write("\n");
      process.stdout.write(
        " " + CYAN + B + "+==========================+" + RST + "\n",
      );
      process.stdout.write(
        " " +
          CYAN +
          B +
          "|" +
          RST +
          B +
          MAG +
          "  SETTINGS               " +
          RST +
          CYAN +
          B +
          "|" +
          RST +
          "\n",
      );
      process.stdout.write(
        " " + CYAN + B + "+==========================+" + RST + "\n",
      );
      process.stdout.write("\n");

      const autoStr = s.autoStopOnClaudeDone
        ? GREEN + B + "[ON] " + RST
        : ORANGE + "[OFF]" + RST;
      const soundStr = s.soundEnabled
        ? GREEN + B + "[ON] " + RST
        : ORANGE + "[OFF]" + RST;

      process.stdout.write(
        " " +
          YELLOW +
          "[1]" +
          RST +
          " Auto-stop when Claude done: " +
          autoStr +
          "\n",
      );
      process.stdout.write(
        " " +
          YELLOW +
          "[2]" +
          RST +
          " Sound effects:              " +
          soundStr +
          "\n",
      );
      process.stdout.write(
        " " +
          YELLOW +
          "[+]" +
          RST +
          DIM +
          "/" +
          RST +
          YELLOW +
          "[-]" +
          RST +
          " Starting level: " +
          CYAN +
          B +
          String(s.startingLevel) +
          RST +
          "\n",
      );
      process.stdout.write("\n");
      process.stdout.write(" " + DIM + "[ESC]  Back" + RST + "\n");
    }

    showLobby();

    const onKey = (chunk: Buffer) => {
      const ch = chunk.toString("utf-8");

      if (!inSettings) {
        if (ch === "q" || ch === "Q" || ch === "\x03" || ch === "\x04") {
          done(null);
          return;
        }
        if (ch === "s" || ch === "S") {
          inSettings = true;
          showSettings();
          return;
        }
      } else {
        // Back from settings
        if (ch === "\x1b") {
          inSettings = false;
          showLobby();
          return;
        }
        const s = loadSettings();
        if (ch === "1") {
          s.autoStopOnClaudeDone = !s.autoStopOnClaudeDone;
          saveSettings(s);
          showSettings();
          return;
        }
        if (ch === "2") {
          s.soundEnabled = !s.soundEnabled;
          saveSettings(s);
          showSettings();
          return;
        }
        if (ch === "+" || ch === "=") {
          s.startingLevel = Math.min(10, s.startingLevel + 1);
          saveSettings(s);
          showSettings();
          return;
        }
        if (ch === "-" || ch === "_") {
          s.startingLevel = Math.max(1, s.startingLevel - 1);
          saveSettings(s);
          showSettings();
          return;
        }
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

// ── File helpers ─────────────────────────────────────────────────────────────

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
    const obj = JSON.parse(fs.readFileSync(TRIGGER_FILE, "utf-8")) as {
      statusFile?: string;
    };
    if (!obj.statusFile) return null;
    try {
      fs.unlinkSync(TRIGGER_FILE);
    } catch (_) {}
    return { statusFile: obj.statusFile };
  } catch (_) {
    return null;
  }
}

export function registerLobbyCleanup(): void {
  const cleanup = () => deleteLobbyFile();
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
