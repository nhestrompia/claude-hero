/**
 * Core types for the .chart file format and the processed note timeline.
 */

/** Raw BPM change event from [SyncTrack] */
export interface BPMEvent {
  /** Tick position */
  tick: number;
  /** BPM * 1000 (e.g. 120000 = 120 BPM), as stored in the chart file */
  bpmMillis: number;
}

/** Raw note event from [ExpertSingle] */
export interface RawNote {
  tick: number;
  /** Fret index 0–4 (we map 0–3 to lanes for 4-lane MVP) */
  fret: number;
  /** Duration in ticks */
  durationTicks: number;
}

/** Post-timing-conversion note with real timestamps */
export interface TimedNote {
  /** Unique index within the song */
  id: number;
  /** Milliseconds from song start when the note should be hit */
  timeMs: number;
  /** Lane index 0–3 */
  lane: number;
  /** Duration in ms (for held notes — ignored in MVP scoring) */
  durationMs: number;
}

/** Metadata from [Song] section and song.ini */
export interface SongMetadata {
  name: string;
  artist: string;
  /** Ticks per beat (quarter note) */
  resolution: number;
  /** Global audio/chart offset in ms (positive = delay notes) */
  offsetMs: number;
}

/** Raw parsed chart data before timing conversion */
export interface ChartFile {
  metadata: SongMetadata;
  bpmEvents: BPMEvent[];
  rawNotes: RawNote[];
}

/** A fully loaded, playable song */
export interface Song {
  metadata: SongMetadata;
  /** Sorted ascending by timeMs */
  notes: TimedNote[];
  /** Absolute path to audio file (.ogg / .mp3 / .wav / .opus), if present */
  audioPath: string | undefined;
}
