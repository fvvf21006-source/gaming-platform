import type { GameSession } from "../../api/client";

export type GameKind = "target" | "chain" | "reflex";

export interface GameTheme {
  emoji: string;
  gradient: string;
  glow: string;
  kind: GameKind;
  tagline: string;
  howTo: string;
}

const THEMES: Record<string, GameTheme> = {
  "Block Blitz": {
    emoji: "🎯", kind: "target", glow: "rgba(255,45,120,.55)",
    gradient: "linear-gradient(135deg,#FF2D78 0%,#8B2BE2 100%)",
    tagline: "20 seconds. Pop everything.",
    howTo: "Targets flash on screen for a split second. Tap them fast — quick hits and combos score more.",
  },
  "Number Chain": {
    emoji: "🧩", kind: "chain", glow: "rgba(0,212,255,.5)",
    gradient: "linear-gradient(135deg,#00D4FF 0%,#3A5BFF 100%)",
    tagline: "Tap 1 → 16 as fast as you can.",
    howTo: "Tap the numbers in order from 1 to 16. Wrong taps cost you points, speed earns them.",
  },
  "Quick Draw": {
    emoji: "⚡", kind: "reflex", glow: "rgba(61,255,154,.5)",
    gradient: "linear-gradient(135deg,#1FBF6B 0%,#0B8F8F 100%)",
    tagline: "Five rounds. Fastest finger wins.",
    howTo: "Wait for the screen to flash green, then tap instantly. Tap early and you lose the round.",
  },
};

const FALLBACK: GameTheme = {
  emoji: "🎮", kind: "reflex", glow: "rgba(255,209,102,.5)",
  gradient: "linear-gradient(135deg,#FFB347 0%,#FF5E62 100%)",
  tagline: "Jump in and set a score.",
  howTo: "Follow the on-screen prompts and score as high as you can.",
};

export function themeFor(name?: string): GameTheme {
  return (name && THEMES[name]) || FALLBACK;
}

export interface PlayerProgress {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNext: number;
  plays: number;
  bestScore: number;
  totalSpent: number;
  streak: number;
  title: string;
}

const TITLES = ["Rookie", "Challenger", "Contender", "Veteran", "Champion", "Legend"];
const XP_PER_LEVEL = 150;

/** Purely cosmetic progression derived from the player's own session history. */
export function computeProgress(history: GameSession[]): PlayerProgress {
  const done = history.filter((s) => s.status === "completed");
  const xp = done.reduce((sum, s) => sum + 30 + Math.round((s.score ?? 0) / 25), 0);
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  // Consecutive calendar days (ending today or yesterday) with at least one completed game.
  const days = new Set(done.map((s) => new Date(s.completedAt ?? s.startedAt).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    level, xp, xpIntoLevel, xpForNext: XP_PER_LEVEL,
    plays: done.length,
    bestScore: done.reduce((m, s) => Math.max(m, s.score ?? 0), 0),
    totalSpent: history.reduce((sum, s) => sum + s.pointsSpent, 0),
    streak,
    title: TITLES[Math.min(Math.floor((level - 1) / 3), TITLES.length - 1)],
  };
}

export function bestScoreFor(history: GameSession[], gameId: string): number {
  return history
    .filter((s) => s.gameId === gameId && s.status === "completed")
    .reduce((m, s) => Math.max(m, s.score ?? 0), 0);
}
