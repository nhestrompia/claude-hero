⸻

PRD — Claude Hero (Clone-Format Song Support)

1. Product Definition

A terminal rhythm mini-game that runs while Claude Code executes, using community song charts compatible with Clone Hero-style song folders.

This is a CLI waiting experience, not a standalone game.

⸻

2. Core User Flow

User runs claude command
↓
Claude running…
↓
Prompt → play game? (y/n)
↓
If yes → random song loads from library
↓
Game plays while Claude works
↓
Claude finishes → game ends immediately → results → Claude output

No menus. No selection screen.

Song is auto-picked randomly for MVP.

⸻

3. Song Library Support

We support standard community chart folders.

Supported Folder Structure

songs/
Song Name/
notes.chart
song.ini
audio.ogg | mp3 | wav

Required files:
• chart file
• audio file

Optional:
• song.ini metadata

⸻

4. Shipping Content

App includes:

songs/
starter-pack/
50 curated songs

Selection criteria:
• small file size
• simple charts
• varied BPM
• legally redistributable OR public domain OR original

Rule:

Do NOT bundle copyrighted songs without permission.

⸻

5. Chart Format Support (MVP Scope)

We parse only:
• Single difficulty (ExpertSingle)
• Notes
• BPM
• Resolution
• Offset

Ignore:
• events
• star power
• sections
• lighting
• modifiers

This keeps parser simple.

⸻

6. Chart Timing Model

Conversion:

msPerBeat = 60000 / bpm
timeMs = (tick / resolution) \* msPerBeat + offset

We convert chart → runtime note timeline once at load.

⸻

7. Game Mechanics

Lanes: 4
Keys: A S D F

Scoring:

Perfect ±40ms → +100
Good ±90ms → +50
Miss → 0

Combo multiplier every 10 hits.

⸻

8. Header Status UI

Always visible:

Claude: THINKING | Time 8.2s | Score 4200 | q quit

When finished:

Claude: DONE

Game stops immediately.

⸻

9. Audio System

Playback strategy:
spawn system audio player.

Platform:
• macOS → afplay
• Linux → ffplay

We record:

audioStartTimestamp

All note timing uses that as reference.

⸻

10. Claude Integration

Wrapper monitors process:

States:

idle → thinking → done

Game loop listens for:

done signal → terminate game loop

Must interrupt instantly.

⸻

11. CLI Interface

claude-hero -- claude "prompt"

Optional flags:

--songs ./path
--no-game
--difficulty expert

⸻

12. MVP Scope Boundary

Included
• chart parser
• random song loader
• audio sync
• status header
• scoring
• instant exit

Excluded
• song selection UI
• difficulty selector
• online downloading
• multiplayer
• chart editor

⸻

13. Risks

Risk Mitigation
parser complexity support only one chart track
copyright user-provided songs
timing drift monotonic clock
audio delay per-song offset

⸻

14. Build Plan (Fast Track)

Phase 1
• Claude wrapper
• status header

Phase 2
• chart parser
• timing conversion

Phase 3
• rendering + input

Phase 4
• audio sync

Phase 5
• polish + starter pack

⸻

15. Definition of Done

You run:

claude-hero -- claude "build API"

Claude starts → game appears → song plays → notes fall → Claude finishes → game ends cleanly → output shown.

No lag.
No desync.
No crashes.

⸻

16. Design Principle (Important)

This should feel like:

a tiny delightful side-effect of running Claude

Not a game product.

Everything unnecessary must be cut.

⸻

✅ Strategic Advice:
Ship with random-song autoplay first.
Song picker is tempting but will delay launch.

⸻
