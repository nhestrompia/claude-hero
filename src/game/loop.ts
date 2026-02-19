/**
 * Main game loop — ties together Claude status, audio, renderer, input, and scoring.
 *
 * Operates in two modes:
 *   Plugin mode:      `status` is a StatusWatcher reading a hook-written file.
 *                     Claude is already running externally in Claude Code.
 *   CLI wrapper mode: `status` is a ClaudeRunner wrapping a subprocess.
 *                     Claude is started via `status.start()`.
 */

import { performance } from "perf_hooks";
import { AudioPlayer } from "../audio/player";
import { Song } from "../chart/types";
import { Keyboard, KeyEvent } from "../input/keyboard";
import { FeedbackKind, renderFrame } from "../renderer/game-view";
import { enterGameMode, exitGameMode } from "../renderer/screen";
import { IClaudeStatus } from "../status";
import { showResults } from "./results";
import { processHit, processMissedNotes } from "./scoring";
import { createInitialState } from "./state";

const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;

export class GameLoop {
  private state = createInitialState();
  private audio = new AudioPlayer();
  private keyboard = new Keyboard();

  private feedbackKind: FeedbackKind = null;
  private feedbackLane = 0;
  private feedbackUntilMs = 0;

  constructor(
    private status: IClaudeStatus,
    private song: Song,
  ) {}

  async run(): Promise<void> {
    enterGameMode();

    // In CLI wrapper mode, start the subprocess now.
    // In plugin mode, Claude is already running — status.start is undefined.
    this.status.start?.();

    // Keyboard events
    this.keyboard.on("hit", (event: KeyEvent) => {
      this.state.activeKeys.add(event.lane);
      const gameTimeMs = event.timeMs - this.audio.audioStartTimestamp;
      const result = processHit(
        event.lane,
        gameTimeMs,
        this.song.notes,
        this.state,
      );
      this.feedbackKind = result;
      this.feedbackLane = event.lane;
      this.feedbackUntilMs = event.timeMs + 500;
      setTimeout(() => this.state.activeKeys.delete(event.lane), 80);
    });
    this.keyboard.on("quit", () => {
      this.state.quitRequested = true;
    });
    this.keyboard.start();

    // Start audio (if available)
    if (this.song.audioPath) {
      this.audio.play(this.song.audioPath);
    } else {
      this.audio.audioStartTimestamp = performance.now();
    }

    this.state.isRunning = true;

    await this.loop();

    this.audio.kill();
    this.keyboard.stop();
    this.state.isRunning = false;

    exitGameMode();
    showResults(this.state, this.song, this.status.output);
  }

  private loop(): Promise<void> {
    return new Promise<void>((resolve) => {
      const tick = () => {
        if (this.state.quitRequested) {
          resolve();
          return;
        }

        const frameStart = performance.now();

        // Update game clock
        this.state.currentTimeMs = frameStart - this.audio.audioStartTimestamp;

        // Sync Claude status (polling — works for both ClaudeRunner and StatusWatcher)
        this.state.elapsedMs = this.status.elapsedMs;
        this.state.elapsedFormatted = this.status.elapsedFormatted;
        this.state.claudeState = this.status.state;

        // Process notes that flew past the hit zone
        processMissedNotes(
          this.state.currentTimeMs,
          this.song.notes,
          this.state,
        );

        // Expire feedback overlay
        if (this.feedbackKind && frameStart > this.feedbackUntilMs) {
          this.feedbackKind = null;
        }

        // Render
        renderFrame(this.state, this.song, {
          feedback: this.feedbackKind,
          feedbackLane: this.feedbackLane,
        });

        // End condition: Claude done + 2 s past last note
        const allNotesPast =
          this.state.currentTimeMs > this.lastNoteTimeMs() + 2000;
        if (this.state.claudeState === "done" && allNotesPast) {
          resolve();
          return;
        }

        const elapsed = performance.now() - frameStart;
        setTimeout(tick, Math.max(0, FRAME_MS - elapsed));
      };

      tick();
    });
  }

  private lastNoteTimeMs(): number {
    if (this.song.notes.length === 0) return 0;
    return this.song.notes[this.song.notes.length - 1].timeMs;
  }
}
