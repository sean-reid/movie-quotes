import { browser } from '$app/environment';

const KEY = 'movie-quotes:stats';

export interface Stats {
  gamesPlayed: number;
  bestScore: number;
  bestStreak: number;
  totalCorrect: number;
  totalRounds: number;
}

const EMPTY: Stats = {
  gamesPlayed: 0,
  bestScore: 0,
  bestStreak: 0,
  totalCorrect: 0,
  totalRounds: 0,
};

export function loadStats(): Stats {
  if (!browser) return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Stats>) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export interface GameOutcome {
  score: number;
  correct: number;
  rounds: number;
  bestStreak: number;
}

export function recordGame(outcome: GameOutcome): Stats {
  const stats = loadStats();
  const next: Stats = {
    gamesPlayed: stats.gamesPlayed + 1,
    bestScore: Math.max(stats.bestScore, outcome.score),
    bestStreak: Math.max(stats.bestStreak, outcome.bestStreak),
    totalCorrect: stats.totalCorrect + outcome.correct,
    totalRounds: stats.totalRounds + outcome.rounds,
  };
  if (browser) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode); stats are best-effort only.
    }
  }
  return next;
}
