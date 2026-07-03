import { isNearDuplicate } from './text.js';
import { shuffle, type Rng } from './rng.js';

export const DEFAULT_CHOICE_COUNT = 3;

export interface QuoteRef {
  quoteId: number;
  text: string;
  movieId: number;
}

export interface AssembledRound {
  /** Choices in display order, already shuffled. */
  choices: QuoteRef[];
  answerQuoteId: number;
}

export interface SelectChoicesOptions {
  answer: QuoteRef;
  /** Decoy candidates ranked most-similar first. */
  decoys: readonly QuoteRef[];
  choiceCount?: number;
  rng?: Rng;
}

/**
 * Build the visible choices for a round: the answer plus the top-ranked decoys
 * that are from distinct films (never the answer's film, never repeating a film)
 * and not near-duplicates of the answer or of each other. Preserves decoy ranking
 * (hardest first), then shuffles for display.
 *
 * Throws if there are not enough usable decoys to fill the requested size, so
 * callers can skip a degenerate round rather than show duplicates.
 */
export function selectChoices(options: SelectChoicesOptions): AssembledRound {
  const { answer, decoys, choiceCount = DEFAULT_CHOICE_COUNT, rng = Math.random } = options;
  const decoysNeeded = choiceCount - 1;

  const picked: QuoteRef[] = [];
  const usedMovies = new Set<number>([answer.movieId]);
  for (const decoy of decoys) {
    if (picked.length === decoysNeeded) break;
    if (decoy.quoteId === answer.quoteId) continue;
    if (usedMovies.has(decoy.movieId)) continue;
    if (isNearDuplicate(decoy.text, answer.text)) continue;
    if (picked.some((p) => isNearDuplicate(p.text, decoy.text))) continue;
    picked.push(decoy);
    usedMovies.add(decoy.movieId);
  }

  if (picked.length < decoysNeeded) {
    throw new Error(`not enough distinct decoys: needed ${decoysNeeded}, found ${picked.length}`);
  }

  return {
    choices: shuffle([answer, ...picked], rng),
    answerQuoteId: answer.quoteId,
  };
}
