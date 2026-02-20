/**
 * .chart file parser.
 *
 * Parses the text-based GH/Clone Hero chart format.
 * Handles: [Song], [SyncTrack], [ExpertSingle]
 * Ignores: [Events], [ExpertStar], lighting, modifiers.
 */

import { BPMEvent, ChartFile, RawNote, SongMetadata } from "./types";

export function parseChart(source: string): ChartFile {
  const sections = splitSections(source);

  const metadata = parseSongSection(sections["Song"] ?? []);
  const bpmEvents = parseSyncTrack(sections["SyncTrack"] ?? []);
  const rawNotes = parseNoteTrack(sections["ExpertSingle"] ?? []);

  return { metadata, bpmEvents, rawNotes };
}

// ---------------------------------------------------------------------------
// Section splitting
// ---------------------------------------------------------------------------

function splitSections(source: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  let currentSection = "";

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line || line === "{" || line === "}") continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = [];
      continue;
    }

    if (currentSection) {
      result[currentSection].push(line);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// [Song] section
// ---------------------------------------------------------------------------

function parseSongSection(lines: string[]): SongMetadata {
  const kv = parseKeyValues(lines);

  const resolution = parseInt(kv["Resolution"] ?? "192", 10);
  // Offset in the chart is in seconds; we convert to ms
  const offsetSec = parseFloat(kv["Offset"] ?? "0");

  return {
    name: stripQuotes(kv["Name"] ?? "Unknown"),
    artist: stripQuotes(kv["Artist"] ?? "Unknown"),
    resolution: isNaN(resolution) ? 192 : resolution,
    offsetMs: isNaN(offsetSec) ? 0 : offsetSec * 1000,
  };
}

// ---------------------------------------------------------------------------
// [SyncTrack] section
// ---------------------------------------------------------------------------

function parseSyncTrack(lines: string[]): BPMEvent[] {
  const events: BPMEvent[] = [];

  for (const line of lines) {
    // Format: <tick> = B <bpm_millis>
    const match = line.match(/^(\d+)\s*=\s*B\s+(\d+)/);
    if (match) {
      events.push({
        tick: parseInt(match[1], 10),
        bpmMillis: parseInt(match[2], 10),
      });
    }
  }

  // Ensure sorted by tick (they usually are, but be safe)
  events.sort((a, b) => a.tick - b.tick);

  // If no BPM events, default 120 BPM
  if (events.length === 0) {
    events.push({ tick: 0, bpmMillis: 120_000 });
  }

  return events;
}

// ---------------------------------------------------------------------------
// [ExpertSingle] section
// ---------------------------------------------------------------------------

function parseNoteTrack(lines: string[]): RawNote[] {
  const notes: RawNote[] = [];

  for (const line of lines) {
    // Format: <tick> = N <fret> <duration>
    const match = line.match(/^(\d+)\s*=\s*N\s+(\d+)\s+(\d+)/);
    if (match) {
      const fret = parseInt(match[2], 10);
      // Frets 0–4 are the 5 standard frets; fret 5 is "open" (forced) — ignore open for MVP
      if (fret > 4) continue;

      notes.push({
        tick: parseInt(match[1], 10),
        fret,
        durationTicks: parseInt(match[3], 10),
      });
    }
  }

  notes.sort((a, b) => a.tick - b.tick);
  return notes;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseKeyValues(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

function stripQuotes(value: string): string {
  return value.replace(/^"(.*)"$/, "$1");
}
