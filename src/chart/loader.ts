/**
 * SongLoader — discovers valid song folders and loads a random one.
 *
 * A valid song folder must contain:
 *   - notes.chart  (or *.chart)
 *   - an audio file: song.ogg | song.mp3 | song.wav | guitar.ogg | etc.
 *
 * Optionally: song.ini for richer metadata.
 */

import * as fs from "fs";
import * as path from "path";
import { parseChart } from "./parser";
import { convertToTimedNotes } from "./timing";
import { Song, SongMetadata } from "./types";

const AUDIO_EXTENSIONS = [".ogg", ".mp3", ".wav", ".flac", ".opus"];
const AUDIO_BASENAMES = ["song", "guitar", "audio", "music", "track"];

export class SongLoader {
  constructor(private readonly songsDir: string) {}

  /** Find all valid song directories under songsDir (1 level deep). */
  findSongDirs(): string[] {
    if (!fs.existsSync(this.songsDir)) return [];

    const entries = fs.readdirSync(this.songsDir, { withFileTypes: true });
    const dirs: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const songPath = path.join(this.songsDir, entry.name);
      if (isValidSongDir(songPath)) {
        dirs.push(songPath);
      }
    }

    return dirs;
  }

  /** Load a specific song directory. */
  load(songDir: string): Song {
    const chartPath = findChartFile(songDir);
    if (!chartPath) throw new Error(`No .chart file found in: ${songDir}`);

    const audioPath = findAudioFile(songDir) ?? undefined;

    const chartSource = fs.readFileSync(chartPath, "utf-8");
    const chartFile = parseChart(chartSource);

    // Override metadata from song.ini if present
    const iniPath = path.join(songDir, "song.ini");
    if (fs.existsSync(iniPath)) {
      const iniMeta = parseSongIni(iniPath);
      if (iniMeta.name) chartFile.metadata.name = iniMeta.name;
      if (iniMeta.artist) chartFile.metadata.artist = iniMeta.artist;
    }

    const notes = convertToTimedNotes(
      chartFile.rawNotes,
      chartFile.bpmEvents,
      chartFile.metadata.resolution,
      chartFile.metadata.offsetMs,
    );

    return {
      metadata: chartFile.metadata,
      notes,
      audioPath,
    };
  }

  /** Pick a random song from the directory and load it. */
  async loadRandom(): Promise<Song> {
    const dirs = this.findSongDirs();
    if (dirs.length === 0) {
      throw new Error(`No valid songs found in: ${this.songsDir}`);
    }
    const chosen = dirs[Math.floor(Math.random() * dirs.length)];
    return this.load(chosen);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidSongDir(dir: string): boolean {
  return findChartFile(dir) !== null;
}

function findChartFile(dir: string): string | null {
  // Prefer notes.chart, then any *.chart
  const preferred = path.join(dir, "notes.chart");
  if (fs.existsSync(preferred)) return preferred;

  const files = fs.readdirSync(dir);
  const chart = files.find((f) => f.endsWith(".chart"));
  return chart ? path.join(dir, chart) : null;
}

function findAudioFile(dir: string): string | null {
  const files = fs.readdirSync(dir).map((f) => f.toLowerCase());

  // Prefer known basenames first
  for (const base of AUDIO_BASENAMES) {
    for (const ext of AUDIO_EXTENSIONS) {
      const match = files.find((f) => f === base + ext);
      if (match) {
        // Return original-case filename
        const original = fs
          .readdirSync(dir)
          .find((f) => f.toLowerCase() === match);
        return original ? path.join(dir, original) : null;
      }
    }
  }

  // Fallback: any audio file
  const any = fs
    .readdirSync(dir)
    .find((f) => AUDIO_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)));
  return any ? path.join(dir, any) : null;
}

/** Parse key=value pairs from a song.ini file. */
function parseSongIni(iniPath: string): Partial<SongMetadata> {
  const meta: Partial<SongMetadata> = {};
  const content = fs.readFileSync(iniPath, "utf-8");

  for (const line of content.split("\n")) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim().toLowerCase();
    const value = line.slice(eqIdx + 1).trim();
    if (key === "name" || key === "title") meta.name = value;
    if (key === "artist") meta.artist = value;
  }

  return meta;
}
