import type { DifficultyBand } from './types.js';

/** Ordered easy -> hard, used for stepping difficulty up and down. */
export const BANDS: readonly DifficultyBand[] = ['easy', 'medium', 'hard'] as const;

/**
 * Map an average decoy similarity in [0, 1] to a difficulty band.
 * The closer the decoys read to the real line, the harder the round.
 */
export function bandForSimilarity(avgSimilarity: number): DifficultyBand {
  if (avgSimilarity >= 0.7) return 'hard';
  if (avgSimilarity >= 0.5) return 'medium';
  return 'easy';
}

/**
 * Choose the next round's target difficulty from the running result: step up
 * after a correct answer, step down after a wrong one. Clamped to the ends.
 */
export function nextBand(current: DifficultyBand, lastCorrect: boolean): DifficultyBand {
  const index = BANDS.indexOf(current);
  const next = lastCorrect ? index + 1 : index - 1;
  const clamped = Math.max(0, Math.min(BANDS.length - 1, next));
  return BANDS[clamped]!;
}
