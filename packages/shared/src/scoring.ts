import type { DifficultyBand } from './types.js';

export const BASE_POINTS: Record<DifficultyBand, number> = {
  easy: 30,
  medium: 60,
  hard: 100,
};

/** Time bonus decays linearly from this maximum to zero over the window below. */
export const MAX_TIME_BONUS = 50;
export const TIME_BONUS_WINDOW_MS = 10_000;

/** Streak multiplier grows by this step per prior correct answer, up to the cap. */
export const STREAK_STEP = 0.1;
export const MAX_STREAK_MULTIPLIER = 2.0;

export interface ScoreInput {
  correct: boolean;
  band: DifficultyBand;
  /** Time taken to answer, in milliseconds. */
  elapsedMs: number;
  /** Number of consecutive correct answers before this guess. */
  priorStreak: number;
}

export interface ScoreOutput {
  points: number;
  streak: number;
  timeBonus: number;
  multiplier: number;
}

export function timeBonus(elapsedMs: number): number {
  const remaining = TIME_BONUS_WINDOW_MS - Math.max(0, elapsedMs);
  const fraction = Math.max(0, remaining) / TIME_BONUS_WINDOW_MS;
  return Math.round(MAX_TIME_BONUS * fraction);
}

export function streakMultiplier(priorStreak: number): number {
  const raw = 1 + STREAK_STEP * Math.max(0, priorStreak);
  return Math.min(MAX_STREAK_MULTIPLIER, raw);
}

/**
 * Score a single guess. A wrong answer earns nothing and resets the streak.
 * A correct answer earns (base + time bonus) times the streak multiplier.
 */
export function scoreGuess(input: ScoreInput): ScoreOutput {
  if (!input.correct) {
    return { points: 0, streak: 0, timeBonus: 0, multiplier: 1 };
  }
  const base = BASE_POINTS[input.band];
  const bonus = timeBonus(input.elapsedMs);
  const multiplier = streakMultiplier(input.priorStreak);
  const points = Math.round((base + bonus) * multiplier);
  return { points, streak: input.priorStreak + 1, timeBonus: bonus, multiplier };
}
