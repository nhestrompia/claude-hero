# Claude Hero

A terminal rhythm game that runs inside Claude Code while you wait for Claude to think.

## Install

```bash
git clone <repo> claude-hero
cd claude-hero
./install.sh          # builds + installs as a Claude Code plugin
```

Requires: `node >= 18`, `jq`, `claude` CLI.

## How it works

Once installed, every time you send a message to Claude Code:

```
Claude Hero: Play while Claude thinks? [y/N]
```

Say **y** and the game opens in a new terminal pane/window.
Press A/S/D/F to hit notes as they fall.
The header shows Claude's status in real time:

```
Claude: THINKING  |  Time 4.1s  |  Score 2400  |  Combo x8  |  q quit
```

When Claude finishes, the header flips to `Claude: DONE` and the game wraps up with a results screen.

## Controls

| Key | Lane | Color  |
| --- | ---- | ------ |
| A   | 0    | Green  |
| S   | 1    | Red    |
| D   | 2    | Yellow |
| F   | 3    | Blue   |
| Q   | --   | Quit   |

## Scoring

| Result  | Window | Points           |
| ------- | ------ | ---------------- |
| Perfect | +-40ms | 100 x multiplier |
| Good    | +-90ms | 50 x multiplier  |
| Miss    | --     | 0, breaks combo  |

Multiplier increases every 10 consecutive hits (max x4). Grades: FC / S / A / B / C / D.

## Terminal setup

| Setup | Experience                         |
| ----- | ---------------------------------- |
| tmux  | Automatic split pane - recommended |
| macOS | New Terminal.app window            |
| Linux | New xterm/gnome-terminal window    |

## Add your own songs

Drop Clone Hero `.chart` song folders into any directory, then:

```bash
export CLAUDE_HERO_SONGS=/path/to/your/songs
```

## Song format

Claude Hero reads Clone Hero `.chart` files:

- `notes.chart` - required (uses [ExpertSingle] section)
- `song.ini` - optional metadata (name, artist)
- `song.ogg` / `song.mp3` - optional audio

## Plugin hooks

The plugin registers two Claude Code hooks:

| Hook             | When it fires                   | What it does                            |
| ---------------- | ------------------------------- | --------------------------------------- |
| UserPromptSubmit | Every time you send a message   | Asks if you want to play, launches game |
| Stop             | When Claude finishes responding | Signals game that Claude is done        |

## Uninstall

```bash
claude plugin uninstall claude-hero
```
