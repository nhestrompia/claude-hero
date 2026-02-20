/**
 * CLI argument parser for VibeBlock.
 *
 * Plugin mode:   vibeblock --status-file /tmp/vibeblock-<id>.json
 * Wrapper mode:  vibeblock [options] -- <command> [args...]
 */

export interface ParsedArgs {
  /** Plugin mode: path to the JSON status file written by hooks. */
  statusFile: string | undefined;
  /** Wrapped command and its arguments (CLI wrapper mode). */
  command: string[];
  /** Pass-through — skip game UI (CLI wrapper mode only). */
  noGame: boolean;
  /** Override starting level (1–10). */
  level: number | undefined;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    statusFile: undefined,
    command: [],
    noGame: false,
    level: undefined,
  };

  const sepIdx = argv.indexOf("--");
  const optPart = sepIdx >= 0 ? argv.slice(0, sepIdx) : argv;
  args.command = sepIdx >= 0 ? argv.slice(sepIdx + 1) : [];

  for (let i = 0; i < optPart.length; i++) {
    const a = optPart[i];
    if (a === "--status-file") {
      args.statusFile = optPart[++i];
    } else if (a === "--no-game") {
      args.noGame = true;
    } else if (a === "--level") {
      const n = parseInt(optPart[++i] ?? "1", 10);
      args.level = isNaN(n) ? 1 : Math.max(1, Math.min(10, n));
    }
  }

  return args;
}
