/**
 * Keyboard input handler for VibeBlock.
 *
 * Controls:
 *   A / ←   move left
 *   D / →   move right
 *   W / ↑   rotate
 *   S / ↓   soft drop
 *   Space   hard drop
 *   E       hold piece
 *   P       pause / unpause
 *   M       toggle sound effects
 *   Q / Ctrl+C   quit
 */

import { EventEmitter } from "events";

export class Keyboard extends EventEmitter {
  private readonly boundHandler: (chunk: Buffer) => void;

  constructor() {
    super();
    this.boundHandler = this.onData.bind(this);
  }

  start(): void {
    process.stdin.on("data", this.boundHandler);
  }

  stop(): void {
    process.stdin.removeListener("data", this.boundHandler);
  }

  private onData(chunk: Buffer): void {
    const str = chunk.toString("utf-8");

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];

      if (ch === "\x03" || ch === "q" || ch === "Q") {
        this.emit("quit");
        return;
      }

      // ANSI arrow key sequences: ESC [ A/B/C/D
      if (ch === "\x1b" && str[i + 1] === "[") {
        const seq = str[i + 2];
        i += 2;
        switch (seq) {
          case "A":
            this.emit("rotate");
            break;
          case "B":
            this.emit("soft-drop");
            break;
          case "C":
            this.emit("move-right");
            break;
          case "D":
            this.emit("move-left");
            break;
        }
        continue;
      }

      switch (ch.toLowerCase()) {
        case "a":
          this.emit("move-left");
          break;
        case "d":
          this.emit("move-right");
          break;
        case "w":
          this.emit("rotate");
          break;
        case "s":
          this.emit("soft-drop");
          break;
        case " ":
          this.emit("hard-drop");
          break;
        case "e":
          this.emit("hold");
          break;
        case "p":
          this.emit("pause");
          break;
        case "m":
          this.emit("toggle-sound");
          break;
      }
    }
  }
}
