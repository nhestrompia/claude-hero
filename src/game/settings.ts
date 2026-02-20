/**
 * Persistent settings (stored in /tmp so they survive across games in the same session).
 */

import * as fs from "fs";

const SETTINGS_FILE = "/tmp/vibeblock-settings.json";

export interface Settings {
  /** Stop the game automatically when Claude finishes thinking. */
  autoStopOnClaudeDone: boolean;
  /** Level to start at (1–10). */
  startingLevel: number;
  /** Sound effects enabled (default OFF). */
  soundEnabled: boolean;
}

const DEFAULTS: Settings = {
  autoStopOnClaudeDone: true,
  startingLevel: 1,
  soundEnabled: false,
};

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      autoStopOnClaudeDone:
        parsed.autoStopOnClaudeDone ?? DEFAULTS.autoStopOnClaudeDone,
      startingLevel: Math.max(
        1,
        Math.min(10, parsed.startingLevel ?? DEFAULTS.startingLevel),
      ),
      soundEnabled: parsed.soundEnabled ?? DEFAULTS.soundEnabled,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (_) {
    /* ignore write errors */
  }
}
