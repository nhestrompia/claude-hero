# Plan: VibeBlock — Cyberpunk Block-Stacker for Claude Code

**TL;DR**: Transform the existing Guitar Hero clone ("claude-hero") into "VibeBlock" — a cyberpunk-themed block-stacking game that plays while Claude thinks. Keep the entire Claude integration layer (hooks, `IClaudeStatus`, CLI modes, audio player), but replace the rhythm-game core (chart parsing, note highway, lane-based input) with a grid-based falling-block game (12x18 board, 7 piece shapes, line clearing, gravity, levels). Add a pause toggle (P key), WASD+Space controls, and a lobby settings screen with auto-stop toggle. Full cyberpunk aesthetic: neon colors, glitch effects on clears, stylized borders, and thematic terminology.

---

## Steps

### Phase 1 — Rename & Clean Up

1. **Rename project** in `package.json`: change `name` to `vibeblock`, update `description`, change `bin` key from `claude-hero` to `vibeblock`. Update `README.md`, `PRD.md`, `IMPLEMENTATION.md`, `PROGRESS.md` accordingly. Purge all references to the old game name and Guitar Hero terminology.

2. **Delete chart system** — remove `src/chart/` entirely (`loader.ts`, `parser.ts`, `timing.ts`, `types.ts`). These parse `.chart` rhythm files which are irrelevant to block-stacking.

3. **Delete song data** — remove `songs/` directory. No chart-based songs needed. Background music support stays via the audio player.

4. **Delete rhythm renderers** — remove `src/renderer/note-renderer.ts` (note highway) and `src/renderer/song-picker.ts` (song selection UI). These are replaced by the board renderer.

5. **Update hook scripts** — in `bin/on-prompt.sh`, change the dialog text from "Play Claude Hero?" to **"Play VibeBlock?"**, update all references. Change the `cli.js` invocation if the binary name changes. Same cleanup in `bin/on-stop.sh`. Update `hooks/hooks.json` if filenames change.

6. **Update slash command** — rewrite `commands/play.md` for VibeBlock.

7. **Update install/uninstall** — `install.sh` and `uninstall.sh`: update hook registrations, binary name, and any display messages.

---

### Phase 2 — New Game Types & State

8. **Create `src/game/pieces.ts`** — Define 7 block shapes (I, O, T, S, Z, J, L) using 2D boolean matrices for all 4 rotation states. Each shape gets a cyberpunk-themed neon color (not the classic palette). Example:
   - I-piece → electric cyan
   - T-piece → neon magenta
   - S-piece → hot pink
   - Z-piece → neon orange
   - O-piece → neon yellow
   - L-piece → electric blue
   - J-piece → acid green

   Export a `Piece` type (`{ shape: boolean[][], color: string, rotation: 0|1|2|3 }`) and a `getRandomPiece()` function using a 7-bag randomizer (each bag contains one of each piece shuffled).

9. **Rewrite `src/game/state.ts`** — Replace rhythm-game state with block-stacker state:
   - `board: (string | null)[][]` — 12 columns × 18 visible rows (+ 2 hidden buffer rows at top)
   - `currentPiece`, `currentX`, `currentY`, `currentRotation`
   - `nextPiece`, `heldPiece`, `canHold`
   - `score`, `level`, `linesCleared`, `totalLinesCleared`
   - `combo` (consecutive clears)
   - `isRunning`, `isPaused`, `quitRequested`, `gameOver`
   - `claudeState`, `elapsedMs`, `autoStopOnClaudeDone: boolean`
   - `lastDropTime`, `dropInterval` (gravity speed)
   - `activeKeys: Set<string>`
   - Create `createInitialState()` accordingly.

10. **Rewrite `src/game/scoring.ts`** — Line-clear scoring:
    - 1 line = 100 × level
    - 2 lines = 300 × level
    - 3 lines = 500 × level
    - 4 lines = 800 × level
    - Combo bonus: consecutive clears multiply further
    - Level up every 10 lines cleared
    - Drop speed: starts at ~1000ms per row drop, decreases ~50ms per level (min ~100ms)
    - Export `processLineClear()`, `calculateScore()`, `getDropInterval()`.

---

### Phase 3 — Board Logic

11. **Create `src/game/board.ts`** — Core board operations (pure functions):
    - `createEmptyBoard(rows, cols)` — 22×10 grid of nulls
    - `canPlace(board, piece, x, y, rotation)` — collision detection
    - `placePiece(board, piece, x, y, rotation)` — writes piece colors to board cells
    - `clearLines(board)` — detects & removes full rows, returns count of cleared lines
    - `getGhostY(board, piece, x, y, rotation)` — hard-drop projection (ghost piece Y)
    - `isGameOver(board)` — checks if any cell in hidden buffer rows (row 0-1) is filled
    - Basic wall-kick table: on rotation, try offset positions `(0,0), (±1,0), (0,-1), (±1,-1)`. Not full SRS but functional.

12. **Create `src/game/actions.ts`** — Maps user actions to state mutations:
    - `moveLeft(state)`, `moveRight(state)` — shift piece ±1 if `canPlace`
    - `rotate(state)` — try rotation + wall kicks
    - `softDrop(state)` — move down 1 row, add 1 to score
    - `hardDrop(state)` — instant drop to ghost position, lock piece, add 2×distance to score
    - `lockPiece(state)` — place piece on board, clear lines, update score, spawn next piece
    - `hold(state)` — swap current with held piece (once per drop)
    - `togglePause(state)` — flip `isPaused`
    - Each returns a new state (or mutates in place, matching existing patterns).

---

### Phase 4 — Input

13. **Rewrite `src/input/keyboard.ts`** — New key mappings:
    - `A` → move left
    - `D` → move right
    - `W` → rotate clockwise
    - `S` → soft drop
    - `Space` → hard drop
    - `E` → hold piece
    - `P` → pause/unpause
    - `Q` → quit
    - Emit events: `move-left`, `move-right`, `rotate`, `soft-drop`, `hard-drop`, `hold`, `pause`, `quit`
    - Support key repeat for move left/right and soft drop (DAS — Delayed Auto Shift ~170ms initial, ~50ms repeat). This uses auto-repeat tracking in the keyboard handler rather than relying on terminal key repeat.

---

### Phase 5 — Rendering (Cyberpunk Theme)

14. **Rewrite `src/renderer/screen.ts`** — Replace `LANE_COLORS`/`LANE_BG_COLORS` with a cyberpunk neon palette using 256-color or true-color ANSI (`\x1b[38;2;r;g;bm`):
    - Neon cyan `(0,255,255)`, magenta `(255,0,255)`, hot pink `(255,105,180)`, acid green `(57,255,20)`, neon yellow `(230,255,0)`, neon orange `(255,102,0)`, electric blue `(125,249,255)`
    - Dark background tones for board: `(10,10,25)` or `(15,5,20)`
    - Border style: double-line box drawing (╔═╗║╚╝) or cyberpunk-styled custom characters
    - Glitch effect function: randomly replaces a few characters with `░▒▓█` or shifts colors briefly (used on line clears)
    - Keep `enterGameMode()`, `exitGameMode()`, `writeAt()`, `getTermSize()`.

15. **Rewrite `src/renderer/game-view.ts`** — Compose the full frame:
    - **Left panel**: The 10×20 game board (each cell is 2 chars wide — `██` for filled, `··` for empty). Board border with cyberpunk-styled box. Ghost piece rendered in dimmed/transparent version of piece color.
    - **Right panel**:
      - "NEXT" piece preview (small 4×4 grid)
      - "HOLD" piece preview
      - Score, Level, Lines displays (neon-styled labels)
      - "Claude: SYNCING" / "Claude: DONE" status
      - Controls help
    - **Top bar**: Game title "▸ VIBEBLOCK" with neon glow, elapsed time, pause indicator `[PAUSED]` when active
    - **Bottom bar**: `[P] PAUSE  [Q] QUIT`
    - On line clear: trigger brief glitch effect (1-2 frames of `░▒▓` replacing the cleared rows before they vanish)
    - When paused: overlay "⟐ PAUSED ⟐" centered on the board with dimmed board behind

16. **Create `src/renderer/effects.ts`** — Cyberpunk visual effects:
    - `glitchRow(row, col, width)` — writes random glitch chars in neon colors
    - `neonText(text, color)` — wraps text in true-color ANSI
    - `pulseColor(baseColor, frameCount)` — subtle color pulse animation
    - `matrixDrip(col, row)` — optional: single column of falling characters (for lobby screen background)

---

### Phase 6 — Game Loop

17. **Rewrite `src/game/loop.ts`** — Adapt the 60fps loop for block-stacking:
    - Keep: `enterGameMode()`, `exitGameMode()`, `performance.now()`-based clock, `setTimeout`-based tick with drift correction, Claude status polling
    - Replace rhythm logic with:
      - Gravity tick: if `currentTimeMs - lastDropTime >= dropInterval` and not paused → soft-drop piece automatically
      - Process keyboard events (already handled via event emitter)
      - On piece lock → `clearLines()` → `calculateScore()` → spawn next piece → check game over
      - End conditions: `gameOver === true` (board full) OR (`claudeState === 'done'` AND `autoStopOnClaudeDone` setting is true)
      - When paused: skip gravity and input processing, keep rendering (with pause overlay)
    - Audio: keep `AudioPlayer` integration for background music (optional — game works without it)

---

### Phase 7 — Results

18. **Rewrite `src/game/results.ts`** — Post-game cyberpunk results screen:
    - Display: Final score, Level reached, Lines cleared, Singles/Doubles/Triples/Quads breakdown
    - Grade: S / A / B / C / D based on score thresholds relative to game duration
    - Reason ended: "BOARD OVERFLOW" or "NEURAL SYNC COMPLETE" (Claude done) or "OPERATOR EXIT" (quit)
    - Claude elapsed time
    - Keep: dump Claude stdout in CLI wrapper mode
    - Style: neon box border, glitch effect on grade reveal

---

### Phase 8 — Lobby & Settings

19. **Rewrite `src/game/lobby.ts`** — Enhanced lobby with settings:
    - Keep: PID writing, trigger file polling, Q to quit
    - Add: settings menu accessible from lobby
      - `[S] Settings` option in lobby
      - Setting 1: **Auto-stop when Claude finishes** (default: ON). Toggle with Enter. Stored in a settings JSON file (`/tmp/vibeblock-settings.json` or similar).
      - Setting 2: **Starting level** (1-10, adjust with ←/→)
    - Cyberpunk lobby screen: neon ASCII art title "VIBEBLOCK", matrix-drip background effect, "AWAITING NEURAL LINK..." status message
    - Back to lobby from settings with Escape

---

### Phase 9 — CLI Entry Point

20. **Rewrite `src/cli.ts`** — Update the two code paths:
    - **Plugin mode**: `lobby → (trigger) → game loop → results → lobby` (remove song picker)
    - **CLI wrapper mode**: `game loop → results → exit` (remove song picker)
    - Remove all `SongLoader` and `pickSong` imports
    - Add `--level` flag to `src/args.ts` (starting level override)
    - Remove `--songs` and `--difficulty` flags, keep `--status-file` and `--no-game`

---

### Phase 10 — Prompt & Documentation

21. **Update `bin/on-prompt.sh`** — Change dialog to "Start VibeBlock?". Keep the terminal-opening logic. Update temp file names from `claude-hero-*` to `vibeblock-*`.

22. **Update all docs**: `README.md` — new name, description, screenshots section, controls reference, cyberpunk theme mention. `PRD.md` — block-stacker product requirements. `IMPLEMENTATION.md` — updated architecture. `PROGRESS.md` — reset for new implementation.

---

## Verification

- `npm run build` compiles cleanly with no TypeScript errors
- `node dist/cli.js -- echo "test"` launches game in CLI wrapper mode, board renders, pieces fall, WASD+Space controls work, P pauses, Q quits, game ends when echo finishes
- `node dist/cli.js --status-file /tmp/test.json` launches in plugin mode, lobby screen shows with settings, pressing S opens settings, auto-stop toggle works
- Line clears increment score correctly (100/300/500/800 × level)
- Board-full triggers game over screen
- Glitch effects appear briefly on line clear
- Neon colors render correctly in terminals with true-color support
- `./install.sh` registers hooks, dialog shows "Play VibeBlock?" on Claude prompt

---

## Decisions

- **Custom color palette**: neon cyberpunk colors, not the standard guideline colors
- **Simplified wall kicks**: try 4 offset positions on rotation rather than full SRS table — keeps it functional without copying SRS exactly
- **7-bag randomizer**: standard fairness approach, no trademark concern
- **Settings stored in temp file**: `/tmp/vibeblock-settings.json` — ephemeral, no persistent config needed
- **DAS (Delayed Auto Shift)**: implemented in keyboard handler for responsive left/right movement
- **Game end**: either condition (board full OR Claude done if auto-stop enabled), plus manual quit
