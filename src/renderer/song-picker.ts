/**
 * Interactive song-selection screen.
 *
 * Shows a list of songs with arrow-key navigation.
 * Enter  → play selected song
 * R      → random pick
 * Q / Ctrl+C → quit
 *
 * Returns the chosen song, or null if the user wants to quit.
 */

import { SongLoader } from "../chart/loader";
import { Song } from "../chart/types";
import {
  ansi,
  enterGameMode,
  exitGameMode,
  getTermSize,
  writeAt,
} from "./screen";

const RESET = ansi.reset;
const BOLD = ansi.bold;
const DIM = ansi.dim;
const CYAN = ansi.fg.cyan;
const YELLOW = ansi.fg.brightYellow;
const GREEN = ansi.fg.brightGreen;
const WHITE = ansi.fg.brightWhite;
const BBLACK = ansi.fg.brightBlack;

export async function pickSong(loader: SongLoader): Promise<Song | null> {
  const dirs = loader.findSongDirs();
  if (dirs.length === 0) return null;

  // Load metadata for each song (synchronous)
  const valid: Song[] = [];
  for (const d of dirs) {
    try {
      valid.push(loader.load(d));
    } catch (_) {}
  }
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0]!;

  return runPicker(valid);
}

function runPicker(songs: Song[]): Promise<Song | null> {
  return new Promise((resolve) => {
    let selected = 0;
    let done = false;

    enterGameMode();

    const render = () => {
      const { cols, rows } = getTermSize();

      process.stdout.write(ansi.clearScreen + ansi.cursorHome);

      const title = "🎸  CLAUDE HERO — SELECT SONG";
      const pad = Math.max(0, Math.floor((cols - title.length) / 2));
      writeAt(2, pad + 1, `${BOLD}${CYAN}${title}${RESET}`);
      writeAt(3, 1, `${DIM}${BBLACK}${"─".repeat(cols)}${RESET}`);

      const listStart = 5;
      songs.forEach((song, i) => {
        const isSelected = i === selected;
        const row = listStart + i * 2;

        const cursor = isSelected ? `${BOLD}${YELLOW}▶ ` : `  `;
        const nameClr = isSelected ? `${BOLD}${WHITE}` : `${DIM}${BBLACK}`;
        const artistClr = isSelected ? `${CYAN}` : `${BBLACK}`;
        const audioTag = song.audioPath ? "" : `${DIM} [no audio]${RESET}`;

        const nameStr = `${cursor}${nameClr}${song.metadata.name}${RESET}${audioTag}`;
        const artistStr = `   ${artistClr}${song.metadata.artist}${RESET}`;

        writeAt(row, 2, nameStr);
        writeAt(row + 1, 2, artistStr);
      });

      const helpRow = Math.min(listStart + songs.length * 2 + 1, rows - 2);
      const help = `${DIM}↑↓ navigate   Enter play   R random   Q quit${RESET}`;
      writeAt(helpRow, Math.max(1, Math.floor((cols - 46) / 2)), help);
    };

    render();

    // Raw key handler — resolves via escape sequences for arrow keys
    const buf: string[] = [];
    let escSeq = "";
    let escTimer: ReturnType<typeof setTimeout> | null = null;

    const onData = (chunk: Buffer) => {
      if (done) return;
      const str = chunk.toString("utf-8");

      for (let i = 0; i < str.length; i++) {
        const ch = str[i]!;

        // Start of an escape sequence
        if (ch === "\x1b") {
          escSeq = ch;
          if (escTimer) clearTimeout(escTimer);
          escTimer = setTimeout(() => {
            // Lone ESC (not arrow) → treat as quit
            if (escSeq === "\x1b") finish(null);
            escSeq = "";
          }, 50);
          continue;
        }

        // Continue escape sequence
        if (escSeq) {
          escSeq += ch;
          if (escSeq === "\x1b[A" || escSeq === "\x1b[B") {
            if (escTimer) clearTimeout(escTimer);
            if (escSeq === "\x1b[A")
              selected = (selected - 1 + songs.length) % songs.length;
            else selected = (selected + 1) % songs.length;
            escSeq = "";
            render();
          } else if (escSeq.length > 3) {
            escSeq = "";
          }
          continue;
        }

        // Regular keybinds
        if (ch === "\r" || ch === "\n") {
          finish(songs[selected]!);
          return;
        }
        if (ch === "r" || ch === "R") {
          finish(songs[Math.floor(Math.random() * songs.length)]!);
          return;
        }
        if (ch === "q" || ch === "Q" || ch === "\x03") {
          finish(null);
          return;
        }

        buf.push(ch);
      }
    };

    process.stdin.on("data", onData);

    function finish(song: Song | null) {
      if (done) return;
      done = true;
      if (escTimer) clearTimeout(escTimer);
      process.stdin.removeListener("data", onData);
      exitGameMode();
      resolve(song);
    }
  });
}
