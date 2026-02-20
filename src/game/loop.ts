/**
 * VibeBlock game loop.
 *
 * Plugin mode:   status = StatusWatcher (reads hook file)
 * CLI wrapper:   status = ClaudeRunner  (wraps subprocess)
 */

import { performance } from "perf_hooks";
import { AudioPlayer } from "../audio/player";
import {
  isSoundEnabled,
  playClaudeDone,
  playLineClear,
  playMove,
  setSoundEnabled,
} from "../audio/sfx";
import { Keyboard } from "../input/keyboard";
import { renderFrame } from "../renderer/game-view";
import { enterGameMode, exitGameMode } from "../renderer/screen";
import { IClaudeStatus } from "../status";
import {
  gravityDrop,
  hardDrop,
  hold,
  moveLeft,
  moveRight,
  rotate,
  softDrop,
  togglePause,
} from "./actions";
import { showResults } from "./results";
import { loadSettings, saveSettings } from "./settings";
import { createInitialState } from "./state";

const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;

export class GameLoop {
  private readonly state;
  private readonly audio = new AudioPlayer();
  private readonly keyboard = new Keyboard();
  private claudeDoneNotified = false;

  constructor(
    private readonly status: IClaudeStatus,
    private readonly audioPath?: string,
  ) {
    const settings = loadSettings();
    setSoundEnabled(settings.soundEnabled);
    this.state = createInitialState(
      settings.startingLevel,
      settings.autoStopOnClaudeDone,
    );
  }

  async run(): Promise<void> {
    enterGameMode();

    // CLI wrapper mode: start subprocess. Plugin mode: no-op.
    this.status.start?.();

    // ── Keyboard bindings ──────────────────────────────────────────────────
    this.keyboard.on("move-left", () => {
      moveLeft(this.state);
      playMove();
    });
    this.keyboard.on("move-right", () => {
      moveRight(this.state);
      playMove();
    });
    this.keyboard.on("rotate", () => {
      rotate(this.state);
      playMove();
    });
    this.keyboard.on("soft-drop", () =>
      softDrop(this.state, performance.now()),
    );
    this.keyboard.on("hard-drop", () => hardDrop(this.state));
    this.keyboard.on("hold", () => {
      hold(this.state);
      playMove();
    });
    this.keyboard.on("pause", () => togglePause(this.state));
    this.keyboard.on("toggle-sound", () => {
      const next = !isSoundEnabled();
      setSoundEnabled(next);
      // Persist the preference
      const s = loadSettings();
      s.soundEnabled = next;
      saveSettings(s);
    });
    this.keyboard.on("quit", () => {
      this.state.quitRequested = true;
      if (!this.state.clearReason) this.state.clearReason = "quit";
    });
    this.keyboard.start();

    // ── Audio ──────────────────────────────────────────────────────────────
    if (this.audioPath) {
      this.audio.play(this.audioPath);
    } else {
      this.audio.audioStartTimestamp = performance.now();
    }

    const startTime = performance.now();
    this.state.lastDropTime = startTime;
    this.state.isRunning = true;

    await this.loop();

    this.audio.kill();
    this.keyboard.stop();
    this.state.isRunning = false;

    exitGameMode();
    await showResults(this.state, this.status.output);
  }

  private loop(): Promise<void> {
    return new Promise<void>((resolve) => {
      const tick = () => {
        const frameStart = performance.now();

        // ── Sync Claude status ─────────────────────────────────────────────
        const prevClaudeState = this.state.claudeState;
        this.state.elapsedMs = this.status.elapsedMs;
        this.state.elapsedFormatted = this.status.elapsedFormatted;
        this.state.claudeState = this.status.state;

        // Fire notification sound once when Claude finishes
        if (
          prevClaudeState !== "done" &&
          this.state.claudeState === "done" &&
          !this.claudeDoneNotified
        ) {
          this.claudeDoneNotified = true;
          playClaudeDone();
        }

        // ── Exit conditions ────────────────────────────────────────────────
        if (this.state.quitRequested || this.state.gameOver) {
          resolve();
          return;
        }

        if (
          this.state.claudeState === "done" &&
          this.state.autoStopOnClaudeDone
        ) {
          if (!this.state.clearReason) this.state.clearReason = "claude-done";
          resolve();
          return;
        }

        // ── Gravity ────────────────────────────────────────────────────────
        if (!this.state.isPaused) {
          gravityDrop(this.state, frameStart);
        }
        // Play line-clear sound (pendingLineClear set by lockPiece regardless of source)
        if (this.state.pendingLineClear > 0) {
          playLineClear();
          this.state.pendingLineClear = 0;
        }

        // ── Glitch countdown ───────────────────────────────────────────────
        if (this.state.glitchFrames > 0) {
          this.state.glitchFrames--;
        }

        // ── Render ─────────────────────────────────────────────────────────
        renderFrame(this.state);

        const elapsed = performance.now() - frameStart;
        setTimeout(tick, Math.max(0, FRAME_MS - elapsed));
      };

      tick();
    });
  }
}
