/**
 * ClaudeRunner — spawns the user's command as a subprocess and monitors it.
 *
 * States: idle → running → done
 * Emits:
 *   'start'   — subprocess has been spawned
 *   'output'  — chunk of stdout data (string)
 *   'error'   — chunk of stderr data (string)
 *   'done'    — process exited, payload: exit code (number)
 */

import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";

export type ClaudeState = "idle" | "running" | "done";

export class ClaudeRunner extends EventEmitter {
  private readonly bin: string;
  private readonly argv: string[];
  private child: ChildProcess | null = null;

  public state: ClaudeState = "idle";
  public exitCode: number = 0;
  public startedAt: number = 0;
  public finishedAt: number = 0;

  /** Accumulated stdout output */
  public output: string = "";
  /** Accumulated stderr output */
  public errorOutput: string = "";

  constructor(bin: string, argv: string[]) {
    super();
    this.bin = bin;
    this.argv = argv;
  }

  /** Elapsed ms since start (0 if not yet started) */
  get elapsedMs(): number {
    if (this.state === "idle") return 0;
    const end = this.state === "done" ? this.finishedAt : performance.now();
    return end - this.startedAt;
  }

  /** Elapsed seconds, formatted as "8.2s" */
  get elapsedFormatted(): string {
    return (this.elapsedMs / 1000).toFixed(1) + "s";
  }

  start(): void {
    if (this.state !== "idle") {
      throw new Error("ClaudeRunner: already started");
    }

    this.startedAt = performance.now();
    this.state = "running";

    this.child = spawn(this.bin, this.argv, {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
    });

    this.emit("start");

    this.child.stdout?.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      this.output += str;
      this.emit("output", str);
    });

    this.child.stderr?.on("data", (chunk: Buffer) => {
      const str = chunk.toString();
      this.errorOutput += str;
      this.emit("error", str);
    });

    this.child.on("close", (code: number | null) => {
      this.finishedAt = performance.now();
      this.exitCode = code ?? 0;
      this.state = "done";
      this.emit("done", this.exitCode);
    });

    this.child.on("error", (err: Error) => {
      this.finishedAt = performance.now();
      this.state = "done";
      this.exitCode = 1;
      this.errorOutput += `\n[claude-hero] Failed to start process: ${err.message}\n`;
      this.emit("done", 1);
    });
  }

  /** Forcefully kill the subprocess. */
  kill(): void {
    if (this.child && this.state === "running") {
      this.child.kill("SIGTERM");
    }
  }
}
