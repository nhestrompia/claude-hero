# Implementation Plan: Claude Hero — Terminal Rhythm Game for Claude Code

## TL;DR

Build a TypeScript/Node.js CLI that wraps `claude` as a subprocess, rendering a 4-lane rhythm mini-game in the terminal while Claude works. The game parses Clone Hero `.chart` files, syncs notes to audio playback, and exits cleanly when Claude finishes. The tool is distributed as an npm package and can **also** be packaged as a Claude Code plugin (using `SessionStart`/`Stop` hooks to launch/kill a side-process). The wrapper approach is the primary integration — Claude Code's hook system cannot take over the terminal for rendering, so a wrapper is architecturally required for the game UI.

---

## Steps

### Phase 0: Project Scaffolding

1. Initialize a TypeScript + Node.js project at the workspace root with `package.json` (name: `claude-hero`), `tsconfig.json`, and an `src/` directory.
2. Set up the `bin` entry in `package.json` pointing to a compiled `dist/cli.js` with a `#!/usr/bin/env node` shebang.
3. Add dev dependencies: `typescript`, `@types/node`, a bundler/build script (plain `tsc` is fine for MVP).
4. Add `.gitignore`, `README.md` skeleton.

### Phase 1: Claude Wrapper & Process Monitor

5. Create `src/cli.ts` — parse CLI arguments using a lightweight parser (e.g., `minimist` or hand-rolled). Accept: `claude-hero -- <claude command and args>`, `--songs <path>`, `--no-game`, `--difficulty expert`.
6. Create `src/claude-runner.ts` — spawn the `claude` command as a child process using `child_process.spawn()`. Capture stdout/stderr into buffers. Track state: `idle → thinking → done`. Expose an `EventEmitter` with events `start`, `output`, `done`, `error`. Use `process.hrtime()` / `performance.now()` for elapsed time tracking.
7. Emit `done` when the child process exits (code 0 or otherwise). Store exit code and full output for display after game ends.

### Phase 2: Chart Parser

8. Create `src/chart/parser.ts` — parse `.chart` files (text-based format). Handle sections: `[Song]` (metadata — `Resolution`, `Offset`, `Name`, `Artist`), `[SyncTrack]` (BPM events as `tick = B bpm_value`), `[ExpertSingle]` (note events as `tick = N fret duration`).
9. Create `src/chart/types.ts` — define types: `ChartFile`, `SongMetadata`, `BPMEvent`, `NoteEvent`, `TimedNote` (post-conversion with `timeMs`, `lane`, `durationMs`).
10. Create `src/chart/timing.ts` — convert tick-based chart events to millisecond timestamps. Walk BPM changes chronologically: for each note tick, find the active BPM, compute `msPerBeat = 60000 / bpm`, and `timeMs = accumulatedMs + ((tick - lastBPMTick) / resolution) * msPerBeat + offset`. Output a `TimedNote[]` sorted by `timeMs`.
11. Create `src/chart/loader.ts` — given a songs directory, find all valid song folders (must contain a `.chart` file + audio file). Pick one at random. Parse `.chart` and `song.ini` (if present, extract title/artist). Return a `Song` object containing metadata, timed notes, and audio file path.

### Phase 3: Terminal Rendering & Input

12. Create `src/renderer/screen.ts` — use raw ANSI escape codes (not blessed — too heavy for a fast game loop). Enter alternate screen buffer (`\x1b[?1049h`), hide cursor, enable raw mode on stdin. On exit, restore terminal. This gives us full terminal control and zero dependencies.
13. Create `src/renderer/game-view.ts` — render the game frame at ~60fps using `setInterval` or `setTimeout` with drift correction. Layout:
    - **Row 0 (header)**: `Claude: THINKING | Time 8.2s | Score 4200 | Combo x3 | q quit`
    - **Rows 1–N (lanes)**: 4 vertical lanes (A, S, D, F). Notes scroll downward. The "hit zone" is near the bottom. Notes are rendered as colored blocks/characters: lane 0 = green, 1 = red, 2 = yellow, 3 = blue (Clone Hero colors).
    - **Bottom row**: Lane labels `[A] [S] [D] [F]` with hit zone indicator.
14. Create `src/renderer/note-renderer.ts` — given `currentTimeMs`, compute which notes are visible in the viewport (e.g., notes within `currentTime - 200ms` to `currentTime + 2000ms`). Map their time position to a Y row on screen. Render each note as a colored character at its (lane, row) position.
15. Create `src/input/keyboard.ts` — listen for raw keypress events on `process.stdin` in raw mode. Map keys: `a/A` → lane 0, `s/S` → lane 1, `d/D` → lane 2, `f/F` → lane 3, `q/Q` → quit. Emit keypresses with `performance.now()` timestamp for hit detection.

### Phase 4: Scoring & Hit Detection

16. Create `src/game/scoring.ts` — implement hit detection: when a key is pressed, find the nearest unhit note in that lane. Compare `|pressTime - noteTime|`:
    - `≤ 40ms` → Perfect (+100 pts)
    - `≤ 90ms` → Good (+50 pts)
    - `> 90ms` → Miss (0 pts)

    Track combo counter (reset on miss), multiplier (increases every 10 consecutive hits), total score, hits/misses/perfects counters.

17. Create `src/game/state.ts` — central game state: `currentTimeMs`, `score`, `combo`, `multiplier`, `activeNotes[]`, `hitNotes: Set<number>`, `isRunning`, `claudeState`. Updated each frame.

### Phase 5: Audio Sync

18. Create `src/audio/player.ts` — platform-aware audio player. Detect OS: macOS → spawn `afplay <file>`, Linux → spawn `ffplay -nodisp -autoexit <file>`. Record `audioStartTimestamp = performance.now()` at spawn time. Expose `kill()` to stop playback immediately.
19. In the game loop (`src/game/loop.ts`), compute `currentTimeMs = performance.now() - audioStartTimestamp`. Use this as the single source of truth for note positions, hit windows, and rendering. This ensures notes sync to audio.
20. Handle audio offset from chart metadata: add `song.offset` to the time calculation.

### Phase 6: Game Loop Integration

21. Create `src/game/loop.ts` — the main game loop:
    ```
    startAudio()
    while (claudeRunner.state !== 'done' && !quit) {
      currentTime = now() - audioStartTime
      processInput(pendingKeys)
      updateState(currentTime)
      render(state)
      await nextFrame() // ~16ms interval
    }
    stopAudio()
    showResults()
    showClaudeOutput()
    ```
22. On `claudeRunner.done` event: set a flag, let the current frame finish, then transition to results screen.
23. Create `src/game/results.ts` — render final score, accuracy %, perfect/good/miss counts, max combo, song name. Then clear screen and print Claude's captured stdout/stderr.

### Phase 7: Claude Code Plugin (Optional Integration)

24. Create `.claude-plugin/plugin.json` with metadata for the plugin.
25. Create `hooks/hooks.json` with a `SessionStart` hook that prompts the user "Play a game while waiting? (y/n)" — but since hooks can't take over the terminal for interactive rendering, this hook would instead write a marker file or set an env var.
26. The **practical plugin approach**: create a `commands/play.md` slash command (`/play`) that tells the user to use `claude-hero` as a wrapper instead, or creates a skill that provides context about the game.
27. **Alternative tmux integration**: A `SessionStart` hook could spawn `claude-hero --standalone` in a **tmux split pane** if tmux is detected, providing a side-by-side experience. The `Stop` hook sends a kill signal. This is the most realistic "plugin" integration since the game needs its own terminal.

### Phase 8: Song Starter Pack & Polish

28. Create `songs/` directory structure. Source 5–10 simple, legally redistributable songs for MVP (original compositions, CC0-licensed, or public domain). Full 50-song pack is a stretch goal.
29. Add `song.ini` files with metadata for each bundled song.
30. Handle edge cases: terminal resize (re-render), missing audio binary (graceful error), no songs found (error message), Claude crashes (show error, exit cleanly), song ends before Claude finishes (loop song or show "waiting..." screen).
31. Add `--no-game` flag: passes through to `claude` directly with no game UI (just a wrapper).

---

## Verification

- **Unit tests for chart parser**: parse a known `.chart` file and assert correct `TimedNote[]` output, especially BPM change handling.
- **Unit tests for timing conversion**: verify tick→ms math with known BPM/resolution values.
- **Unit tests for scoring**: simulate keypresses at known offsets and verify Perfect/Good/Miss classification.
- **Integration test**: run `claude-hero -- echo "hello"` (wrapping `echo` instead of `claude`), verify game starts, `echo` completes instantly, game exits, and "hello" is printed.
- **Manual test**: run `claude-hero -- claude "explain this file"` end-to-end, verify audio sync, note rendering, input responsiveness, and clean exit.
- **Platform test**: verify macOS audio playback with `afplay`, Linux with `ffplay`.

---

## Key Decisions

| Decision          | Chose                                            | Over                         | Why                                                                                                                            |
| ----------------- | ------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Integration model | CLI wrapper (`claude-hero -- claude ...`)        | Claude Code plugin/hook      | Hooks run as subprocesses and cannot take over terminal for interactive rendering. A wrapper owns the terminal.                |
| Rendering         | Raw ANSI escape codes via `process.stdout.write` | `blessed` library            | `blessed` is unmaintained (last publish 10 years ago) and heavyweight. Raw ANSI gives full control, zero deps, max frame rate. |
| Language          | TypeScript / Node.js                             | Python, Go, Rust             | Matches Claude Code ecosystem (npm-distributable), excellent cross-platform subprocess management, raw terminal I/O support.   |
| Timing clock      | `performance.now()` (monotonic)                  | `Date.now()`                 | Monotonic high-resolution clock avoids drift. All game time is relative to `audioStartTimestamp`.                              |
| Lane count        | 4 lanes (A/S/D/F)                                | 5 lanes (Clone Hero default) | Simplified to keep it "tiny and delightful," not a full game product.                                                          |
| Chart difficulty  | ExpertSingle only                                | Multiple difficulties        | Keeps parser simple per PRD scope.                                                                                             |
| Plugin fallback   | tmux split pane via `SessionStart` hook          | Direct terminal takeover     | Only realistic way to run an interactive game alongside Claude Code's own terminal UI.                                         |

---

## File Structure

claude-hero/
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
├── PRD.md
├── implementation.md
├── src/
│ ├── cli.ts # Entry point, arg parsing
│ ├── claude-runner.ts # Claude subprocess wrapper
│ ├── chart/
│ │ ├── types.ts # Chart data types
│ │ ├── parser.ts # .chart file parser
│ │ ├── timing.ts # Tick → ms conversion
│ │ └── loader.ts # Song folder discovery & loading
│ ├── renderer/
│ │ ├── screen.ts # Terminal setup/teardown, ANSI helpers
│ │ ├── game-view.ts # Frame composition & rendering
│ │ └── note-renderer.ts # Note positioning & drawing
│ ├── input/
│ │ └── keyboard.ts # Raw keypress handling
│ ├── audio/
│ │ └── player.ts # Cross-platform audio playback
│ └── game/
│ ├── state.ts # Central game state
│ ├── scoring.ts # Hit detection & scoring
│ ├── loop.ts # Main game loop
│ └── results.ts # End-of-game results screen
├── songs/
│ └── starter-pack/ # Bundled songs (legally clear)
│ └── <song-name>/
│ ├── notes.chart
│ ├── song.ini
│ └── song.ogg
├── .claude-plugin/ # Optional Claude Code plugin
│ └── plugin.json
├── hooks/
│ └── hooks.json # SessionStart/Stop hooks (tmux approach)
└── commands/
└── play.md # /play slash command
