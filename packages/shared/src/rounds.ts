import { isNearDuplicate } from './text.js';
import { shuffle, type Rng } from './rng.js';

export const DEFAULT_CHOICE_COUNT = 3;

export interface QuoteRef {
  quoteId: number;
  text: string;
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
 * that are distinct and not near-duplicates of the answer or of each other.
 * Preserves decoy ranking (hardest first) when picking, then shuffles for display.
 *
 * Throws if there are not enough usable decoys to fill the requested size, so
 * callers can skip a degenerate round rather than show duplicates.
 */
export function selectChoices(options: SelectChoicesOptions): AssembledRound {
  const { answer, decoys, choiceCount = DEFAULT_CHOICE_COUNT, rng = Math.random } = options;
  const decoysNeeded = choiceCount - 1;

  const picked: QuoteRef[] = [];
  for (const decoy of decoys) {
    if (picked.length === decoysNeeded) break;
    if (decoy.quoteId === answer.quoteId) continue;
    if (isNearDuplicate(decoy.text, answer.text)) continue;
    if (picked.some((p) => p.quoteId === decoy.quoteId || isNearDuplicate(p.text, decoy.text))) {
      continue;
    }
    picked.push(decoy);
  }

  if (picked.length < decoysNeeded) {
    throw new Error(`not enough distinct decoys: needed ${decoysNeeded}, found ${picked.length}`);
  }

  return {
    choices: shuffle([answer, ...picked], rng),
    answerQuoteId: answer.quoteId,
  };
}
