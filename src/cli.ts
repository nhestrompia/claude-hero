#!/usr/bin/env node
/**
 * claude-hero CLI entry point.
 *
 * Two modes:
 *
 *   Plugin mode (launched by Claude Code UserPromptSubmit hook):
 *     claude-hero --status-file /tmp/claude-hero-<id>.json [--songs <dir>]
 *     Reads Claude's status from the JSON file.  Claude is running in Claude Code.
 *     After the game the window stays open (lobby) and reacts to the next prompt
 *     automatically — no new Terminal window needed.
 *
 *   CLI wrapper mode (legacy):
 *     claude-hero [options] -- <command> [args...]
 *     Wraps the command directly.
 */

import * as path from "path";
import { parseArgs } from "./args";
import { SongLoader } from "./chart/loader";
import { ClaudeRunner } from "./claude-runner";
import { enterLobby, registerLobbyCleanup } from "./game/lobby";
import { GameLoop } from "./game/loop";
import { pickSong } from "./renderer/song-picker";
import { StatusWatcher } from "./status";

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Resolve songs directory
  const songsDir = args.songsDir ?? path.join(__dirname, "..", "songs");

  const loader = new SongLoader(songsDir);

  // ── Plugin mode ─────────────────────────────────────────────────────────
  if (args.statusFile) {
    registerLobbyCleanup();

    let currentStatusFile = args.statusFile;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Song selection screen
      const song = await pickSong(loader);
      if (!song) {
        // User quit from song picker
        process.exit(0);
      }

      const status = new StatusWatcher(currentStatusFile);
      const game = new GameLoop(status, song);
      await game.run();

      // ── Lobby: wait for next prompt or user quitting ──────────────────
      const trigger = await enterLobby();
      if (!trigger) {
        // User pressed Q — close the window
        process.exit(0);
      }
      // New prompt arrived — loop with the fresh status file
      currentStatusFile = trigger.statusFile;
    }
  }

  // ── CLI wrapper mode ─────────────────────────────────────────────────────
  if (args.command.length === 0) {
    printUsage();
    process.exit(0);
  }

  const runner = new ClaudeRunner(args.command[0], args.command.slice(1));

  // --no-game: pure passthrough, no rendering
  if (args.noGame) {
    runner.on("output", (chunk: string) => process.stdout.write(chunk));
    runner.on("error", (chunk: string) => process.stderr.write(chunk));
    runner.on("done", (code: number) => process.exit(code));
    runner.start();
    return;
  }

  // Song selection then game loop
  const song = await pickSong(loader);

  if (!song) {
    console.warn("[claude-hero] No songs found — running without game.");
    console.warn("  Add songs to:", songsDir);
    runner.on("output", (chunk: string) => process.stdout.write(chunk));
    runner.on("error", (chunk: string) => process.stderr.write(chunk));
    runner.on("done", (code: number) => process.exit(code));
    runner.start();
    return;
  }

  const game = new GameLoop(runner, song);
  await game.run();
}

function printUsage(): void {
  console.log(`
claude-hero — terminal rhythm game for Claude Code

PLUGIN MODE (install hooks into Claude Code):
  ./install.sh
  Then ask Claude a question — it will offer to play!

CLI WRAPPER MODE:
  claude-hero [options] -- <command> [args...]

Options:
  --status-file <path>   Plugin mode: path to hook status file
  --songs <dir>          Path to song library (default: ./songs)
  --no-game              Passthrough — no game, just run the command
  --difficulty <name>    Difficulty (default: ExpertSingle)

Examples:
  claude-hero -- claude "build my API"
  claude-hero --songs ~/my-songs -- claude "explain this"
`);
}

main().catch((err) => {
  console.error("[claude-hero] Fatal error:", err);
  process.exit(1);
});
