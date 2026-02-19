/**
 * Tick-to-millisecond conversion for .chart files.
 *
 * Chart notes use "ticks" (MIDI-like). We convert them to wall-clock ms
 * by walking the BPM event list and accumulating time between BPM changes.
 *
 * Formula per segment:
 *   msPerBeat = 60_000 / (bpmMillis / 1000)
 *             = 60_000_000 / bpmMillis
 *   tickDelta = noteTick - segmentStartTick
 *   ms        = accumulatedMs + (tickDelta / resolution) * msPerBeat + globalOffsetMs
 */

import { BPMEvent, RawNote, TimedNote } from "./types";

export function convertToTimedNotes(
  rawNotes: RawNote[],
  bpmEvents: BPMEvent[],
  resolution: number,
  offsetMs: number,
): TimedNote[] {
  if (rawNotes.length === 0) return [];
  if (bpmEvents.length === 0)
    throw new Error("No BPM events — cannot convert ticks to ms");

  const timed: TimedNote[] = [];

  for (let idx = 0; idx < rawNotes.length; idx++) {
    const note = rawNotes[idx];
    const timeMs = tickToMs(note.tick, bpmEvents, resolution) + offsetMs;
    const durationMs =
      note.durationTicks > 0
        ? tickToMs(note.tick + note.durationTicks, bpmEvents, resolution) +
          offsetMs -
          timeMs
        : 0;

    timed.push({
      id: idx,
      timeMs,
      lane: note.fret % 4, // map fret 0-4 → lane 0-3
      durationMs,
    });
  }

  // Already sorted from parser, but ensure it
  timed.sort((a, b) => a.timeMs - b.timeMs);
  return timed;
}

/**
 * Convert a tick position to milliseconds by walking BPM segments.
 */
function tickToMs(
  targetTick: number,
  bpmEvents: BPMEvent[],
  resolution: number,
): number {
  let accMs = 0;
  let segmentStartTick = 0;
  let currentBpmMillis = bpmEvents[0].bpmMillis;

  for (let i = 0; i < bpmEvents.length; i++) {
    const event = bpmEvents[i];
    const nextEventTick =
      i + 1 < bpmEvents.length ? bpmEvents[i + 1].tick : Infinity;

    if (targetTick <= event.tick) {
      // Target is before or at this BPM event — use previous segment
      break;
    }

    if (i > 0) {
      // Accumulate time for the previous segment
      const segEnd = Math.min(targetTick, event.tick);
      accMs += segmentMs(
        segmentStartTick,
        segEnd,
        currentBpmMillis,
        resolution,
      );
    }

    segmentStartTick = event.tick;
    currentBpmMillis = event.bpmMillis;

    if (targetTick <= nextEventTick) {
      // Target falls within this segment
      accMs += segmentMs(
        segmentStartTick,
        targetTick,
        currentBpmMillis,
        resolution,
      );
      return accMs;
    }
  }

  // Target is past all BPM events — use final BPM
  const lastEvent = bpmEvents[bpmEvents.length - 1];
  accMs += segmentMs(
    lastEvent.tick,
    targetTick,
    lastEvent.bpmMillis,
    resolution,
  );
  return accMs;
}

function segmentMs(
  fromTick: number,
  toTick: number,
  bpmMillis: number,
  resolution: number,
): number {
  const tickDelta = toTick - fromTick;
  // msPerBeat = 60_000_000 / bpmMillis
  const msPerBeat = 60_000_000 / bpmMillis;
  return (tickDelta / resolution) * msPerBeat;
}
