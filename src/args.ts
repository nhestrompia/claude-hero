/**
 * Minimal CLI argument parser — no dependencies.
 *
 * Two operating modes:
 *
 * 1. Plugin mode (launched by Claude Code hook):
 *      claude-hero --status-file /tmp/claude-hero-<id>.json [--songs <dir>]
 *      Shows the rhythm game; reads Claude's status from the file.
 *
 * 2. CLI wrapper mode (legacy):
 *      claude-hero [options] -- <command> [command args...]
 *      Wraps a command and shows the game while it runs.
 */

export interface ParsedArgs {
  /** Plugin mode: path to the JSON status file written by hooks */
  statusFile: string | undefined;
  /** The wrapped command and its arguments (CLI wrapper mode) */
  command: string[];
  /** Custom songs directory */
  songsDir: string | undefined;
  /** Pass-through mode — skip game UI (CLI wrapper mode only) */
  noGame: boolean;
  /** Difficulty string (default: ExpertSingle) */
  difficulty: string;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    statusFile: undefined,
    command: [],
    songsDir: undefined,
    noGame: false,
    difficulty: "ExpertSingle",
  };

  // Locate the `--` separator
  const separatorIndex = argv.indexOf("--");
  const optionPart = separatorIndex >= 0 ? argv.slice(0, separatorIndex) : argv;
  const commandPart = separatorIndex >= 0 ? argv.slice(separatorIndex + 1) : [];

  args.command = commandPart;

  // Parse options
  for (let i = 0; i < optionPart.length; i++) {
    const arg = optionPart[i];
    if (arg === "--songs" || arg === "--songs-dir" || arg === "-s") {
      args.songsDir = optionPart[++i];
    } else if (arg === "--no-game") {
      args.noGame = true;
    } else if (arg === "--difficulty") {
      args.difficulty = optionPart[++i] ?? "ExpertSingle";
    } else if (arg === "--status-file") {
      args.statusFile = optionPart[++i];
    }
  }

  return args;
}
