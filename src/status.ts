/**
 * Shared interface for Claude status — implemented by both ClaudeRunner (CLI wrapper mode)
 * and StatusWatcher (Claude Code plugin mode).
 */

import { readFileSync } from "fs";
import { performance } from "perf_hooks";
import { ClaudeState } from "./claude-runner";

export interface IClaudeStatus {
  /** Current processing state */
  readonly state: ClaudeState;
  /** Elapsed milliseconds since start */
  readonly elapsedMs: number;
  /** Elapsed formatted as "8.2s" */
  readonly elapsedFormatted: string;
  /** Captured output (empty in plugin mode) */
  readonly output: string;
  /**
   * Optional start method — called in CLI wrapper mode to spawn the subprocess.
   * In plugin mode (StatusWatcher) this is a no-op.
   */
  start?(): void;
}

/**
 * Status file format written by the hook scripts.
 * on-prompt.sh writes { status: 'running', startedAt: <epoch ms> }
 * on-stop.sh writes   { status: 'done' }
 */
interface StatusFileData {
  status: "running" | "done";
  startedAt?: number;
  sessionId?: string;
}

/**
 * Reads a JSON status file written by on-prompt.sh / on-stop.sh hooks.
 * Polls the file on every property access — no file watchers needed.
 */
export class StatusWatcher implements IClaudeStatus {
  private readonly localStartedAt: number;

  constructor(private readonly filePath: string) {
    this.localStartedAt = performance.now();
  }

  get state(): ClaudeState {
    try {
      const data: StatusFileData = JSON.parse(
        readFileSync(this.filePath, "utf8"),
      );
      return data.status === "done" ? "done" : "running";
    } catch {
      // File not yet written or malformed — assume still running
      return "running";
    }
  }

  get elapsedMs(): number {
    return performance.now() - this.localStartedAt;
  }

  get elapsedFormatted(): string {
    return (this.elapsedMs / 1000).toFixed(1) + "s";
  }

  /** Plugin mode has no captured output — Claude Code shows its own output */
  get output(): string {
    return "";
  }
}
