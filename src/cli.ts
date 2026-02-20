#!/usr/bin/env node
/**
 * VibeBlock entry point.
 *
 * Plugin mode   (default):  launched by on-prompt.sh with --status-file
 *   • Reads a JSON status file written by hooks.
 *   • Loops: lobby → game → lobby → game → ... until user quits.
 *
 * CLI wrapper mode:          vibeblock [options] -- <command> [args...]
 *   • Wraps a subprocess, shows full game UI while it runs.
 */

import { parseArgs } from "./args";
import { ClaudeRunner } from "./claude-runner";
import { enterLobby, registerLobbyCleanup } from "./game/lobby";
import { GameLoop } from "./game/loop";
import { StatusWatcher } from "./status";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  registerLobbyCleanup();

  if (args.statusFile) {
    // ── Plugin mode — launched by on-prompt.sh with a status file ────────
    // Run the game, then fall into the lobby so the terminal stays useful.
    const watcher = new StatusWatcher(args.statusFile);
    const game = new GameLoop(watcher);
    await game.run();
    // fall through into lobby loop below
  } else if (args.command.length > 0) {
    // ── CLI wrapper mode ──────────────────────────────────────────────────
    if (args.noGame) {
      // Just run the command without the game UI.
      const { spawn } = await import("child_process");
      const [cmd, ...cmdArgs] = args.command;
      const child = spawn(cmd, cmdArgs, { stdio: "inherit" });
      await new Promise<void>((res) => child.on("close", res));
      return;
    }

    const runner = new ClaudeRunner(args.command[0], args.command.slice(1));
    const game = new GameLoop(runner);
    await game.run();
    return;
  }

  // ── Start-up lobby — wait for Claude to trigger a game ────────────────────
  while (true) {
    const trigger = await enterLobby();

    if (!trigger) {
      // User pressed Q — exit cleanly.
      break;
    }

    const watcher = new StatusWatcher(trigger.statusFile);
    const game = new GameLoop(watcher);
    await game.run();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[vibeblock] fatal error:", err);
  process.exit(1);
});
