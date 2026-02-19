# Claude Hero — Build Progress

Track of all phases and files built during implementation.

---

## Phase 0 — Project Scaffolding ✅

| File            | Description                                                            |
| --------------- | ---------------------------------------------------------------------- |
| `package.json`  | npm package, `bin` entry → `dist/cli.js`, Node >=18, zero runtime deps |
| `tsconfig.json` | TypeScript config, ES2022, strict mode, `src/` → `dist/`               |
| `.gitignore`    | Ignores `node_modules/`, `dist/`, `.env`, `.DS_Store`                  |
| `README.md`     | Usage examples, controls table, scoring table, song format docs        |

---

## Phase 1 — Claude Wrapper ✅

| File                   | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `src/cli.ts`           | Entry point (shebang). Parses args, handles `--no-game`, launches `GameLoop` |
| `src/args.ts`          | Zero-dependency CLI arg parser; splits on `--` separator                     |
| `src/claude-runner.ts` | `ClaudeRunner extends EventEmitter`, wraps child process, tracks state/time  |

---

## Phase 2 — Chart Parser ✅

| File                  | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `src/chart/types.ts`  | Interfaces: `BPMEvent`, `RawNote`, `TimedNote`, `SongMetadata`, `Song` |
| `src/chart/parser.ts` | `.chart` file parser — Song/SyncTrack/ExpertSingle sections            |
| `src/chart/timing.ts` | Tick→ms conversion via BPM segment walking; maps `fret % 4` to lane    |
| `src/chart/loader.ts` | `SongLoader` scans song dirs, loads random song, reads `song.ini`      |

---

## Phase 3 — Terminal Rendering & Input ✅

| File                            | Description                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| `src/renderer/screen.ts`        | Raw ANSI helpers, enter/exit alt-screen, `LANE_COLORS`, `writeAt()` |
| `src/renderer/note-renderer.ts` | Maps `TimedNote` positions to terminal rows, draws fall zone        |
| `src/renderer/game-view.ts`     | Full frame composer: header, separator, notes, labels, feedback     |
| `src/input/keyboard.ts`         | Raw keypress handler; emits `hit` (KeyEvent) and `quit` events      |

---

## Phase 4 — Scoring & Hit Detection ✅

| File                  | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `src/game/state.ts`   | `GameState` interface + `createInitialState()` factory                     |
| `src/game/scoring.ts` | `processHit()`, `processMissedNotes()`, `accuracy()` — ±40ms/±90ms windows |

---

## Phase 5 — Audio Sync ✅

| File                  | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `src/audio/player.ts` | `AudioPlayer`: macOS→`afplay`, Linux→`ffplay`; exposes `audioStartTimestamp` |

---

## Phase 6 — Game Loop Integration ✅

| File                  | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `src/game/loop.ts`    | `GameLoop` class: 60fps loop, ties runner + audio + input + renderer |
| `src/game/results.ts` | Post-game results screen with grade (FC/S/A/B/C/D) and Claude output |

---

## Phase 7 — Claude Code Plugin ✅

| File                         | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `.claude-plugin/plugin.json` | Plugin metadata — name, version, hooks reference |
| `hooks/hooks.json`           | `SessionStart` hook — prints install hint        |
| `commands/play.md`           | `/play` slash command documentation              |

---

## Phase 8 — Song Starter Pack ✅

| File                                                 | Description                              |
| ---------------------------------------------------- | ---------------------------------------- |
| `songs/starter-pack/rock-while-you-code/notes.chart` | Bundled example song (no audio required) |
| `songs/starter-pack/rock-while-you-code/song.ini`    | Song metadata override                   |

---

## Build Status

Run `npm install && npm run build` to compile TypeScript and verify zero errors.

The binary will be available at `dist/cli.js`.
Install globally: `npm install -g .` → `claude-hero` command becomes available.
