# claude-hero

Play a rhythm game while Claude Code processes your request.

Claude Hero installs two hooks:

- **UserPromptSubmit** — offers to launch the game when you send a prompt
- **Stop** — signals the game when Claude finishes so it shows "DONE"

## How it works

1. You ask Claude a question
2. A prompt appears: `🎸 Play while Claude thinks? [y/N]`
3. Press **y** — the game opens in a new terminal pane/window
4. Hit **A S D F** keys to match falling notes
5. The header shows **Claude: THINKING** → **Claude: DONE** when finished
6. Press **Q** to quit early

## Controls

| Key | Lane | Color  |
| --- | ---- | ------ |
| A   | 0    | Green  |
| S   | 1    | Red    |
| D   | 2    | Yellow |
| F   | 3    | Blue   |
| Q   | —    | Quit   |

## Scoring

| Result  | Window | Points           |
| ------- | ------ | ---------------- |
| Perfect | ±40ms  | 100 × multiplier |
| Good    | ±90ms  | 50 × multiplier  |
| Miss    | —      | 0, resets combo  |

Multiplier increases every 10 consecutive hits (max ×4).

## Tips

- Run Claude Code inside **tmux** for an automatic split-pane setup.
- Set `CLAUDE_HERO_SONGS=/path/to/songs` to load your own `.chart` files.
- Install once: `./install.sh`
