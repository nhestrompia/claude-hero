/**
 * Cross-platform audio playback via subprocess.
 * macOS  → afplay (most formats) or ffplay (for .opus)
 * Linux  → ffplay -nodisp -autoexit
 */

import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import { performance } from "perf_hooks";

export class AudioPlayer {
  private proc: ChildProcess | null = null;
  /** Monotonic timestamp recorded when the audio process was spawned */
  public audioStartTimestamp = 0;

  /**
   * Start playing the given audio file.
   * Returns the start timestamp so the game clock can sync.
   */
  play(filePath: string): number {
    const args = buildArgs(filePath);
    this.audioStartTimestamp = performance.now();

    this.proc = spawn(args[0], args.slice(1), {
      stdio: "ignore",
      detached: false,
    });

    this.proc.on("error", (err) => {
      // Audio playback errors are non-fatal — game continues silently.
      if (process.env["VIBEBLOCK_DEBUG"]) {
        process.stderr.write(`[audio] error: ${err.message}\n`);
      }
    });

    return this.audioStartTimestamp;
  }

  /** Stop playback (called on game end or quit). */
  kill(): void {
    if (this.proc) {
      try {
        this.proc.kill();
      } catch {
        // Ignore — process may have already exited.
      }
      this.proc = null;
    }
  }

  get isPlaying(): boolean {
    return this.proc !== null;
  }
}

function buildArgs(filePath: string): string[] {
  const ext = path.extname(filePath).toLowerCase();

  if (process.platform === "darwin") {
    // afplay does not decode .opus — try ffplay or mpv instead
    if (ext === ".opus") {
      // Check will happen at runtime; errors are silenced in play()
      if (isMpvAvailable())
        return ["mpv", "--no-video", "--really-quiet", filePath];
      return ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", filePath];
    }
    return ["afplay", filePath];
  }
  // Linux / other — requires ffmpeg
  return ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", filePath];
}

/** Quick synchronous PATH check (cached after first call). */
let _mpvChecked = false;
let _mpvFound = false;
function isMpvAvailable(): boolean {
  if (_mpvChecked) return _mpvFound;
  _mpvChecked = true;
  try {
    const { execSync } =
      require("child_process") as typeof import("child_process");
    execSync("which mpv", { stdio: "ignore" });
    _mpvFound = true;
  } catch (_) {}
  return _mpvFound;
}
