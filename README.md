# VibeBlock

A cyberpunk block-stacker terminal game that runs as a Claude Code plugin while you wait for Claude to think.

## Install

```bash
git clone <repo> vibeblock
cd vibeblock
./install.sh
```

Requires: `node >= 18`, `jq`, `claude` CLI.

## How it works

Once installed, every time you send a message to Claude Code a dialog appears:

> **Play VibeBlock while you wait?** [Skip] [Play!]

Click **Play!** and the game opens in a new terminal pane or window.
Stack blocks, clear lines, and score points while Claude processes your request.
The title bar shows the Claude status live — **◌ SYNCING...** → **● DONE**.

## Controls

```
[W] Rotate   [A] Left   [D] Right   [S] Soft drop
[Space] Hard drop   [E] Hold   [P] Pause   [M] Sound   [Q] Quit
```

## CLI wrapper mode

Run any command and play while it processes:

```bash
vibeblock -- npm test
vibeblock --level 5 -- make build
```

## Sound effects

Drop `.wav` files in `sounds/`:

- `move.wav` — on block move / rotate / hold
- `clean.wav` — on line clear
- `notification.wav` — when Claude finishes

Sound is **off by default**. Press **M** in-game to toggle.

## Debug

```bash
VIBEBLOCK_DEBUG=1 node dist/cli.js --status-file /tmp/test.json
```

## Uninstall

```bash
./uninstall.sh
```
