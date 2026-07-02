import { describe, expect, it } from 'vitest';
import { selectChoices } from '../src/rounds.js';
import { mulberry32 } from '../src/rng.js';

const answer = { quoteId: 1, text: 'Here is looking at you, kid.' };

describe('selectChoices', () => {
  it('produces the requested number of distinct choices including the answer', () => {
    const decoys = [
      { quoteId: 2, text: 'We will always have Paris.' },
      { quoteId: 3, text: 'Round up the usual suspects.' },
      { quoteId: 4, text: 'I love the smell of napalm in the morning.' },
    ];
    const round = selectChoices({ answer, decoys, choiceCount: 3, rng: mulberry32(42) });
    expect(round.choices).toHaveLength(3);
    expect(round.answerQuoteId).toBe(1);
    const ids = round.choices.map((c) => c.quoteId);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain(1);
  });

  it('skips near-duplicate decoys and the answer itself', () => {
    const decoys = [
      { quoteId: 1, text: 'Here is looking at you, kid.' }, // same as answer id
      { quoteId: 5, text: 'here is looking at you kid' }, // near-dup of answer
      { quoteId: 6, text: 'We will always have Paris.' },
      { quoteId: 7, text: 'we will always have paris' }, // near-dup of 6
      { quoteId: 8, text: 'Round up the usual suspects.' },
    ];
    const round = selectChoices({ answer, decoys, choiceCount: 3, rng: mulberry32(7) });
    const ids = round.choices.map((c) => c.quoteId).sort((a, b) => a - b);
    expect(ids).toEqual([1, 6, 8]);
  });

  it('throws when there are not enough usable decoys', () => {
    const decoys = [{ quoteId: 5, text: 'here is looking at you kid' }];
    expect(() => selectChoices({ answer, decoys, choiceCount: 3 })).toThrow(/not enough/);
  });

  it('supports larger answer sizes from the same pool', () => {
    const decoys = Array.from({ length: 8 }, (_, i) => ({
      quoteId: 10 + i,
      text: `distinct decoy line number ${i}`,
    }));
    const round = selectChoices({ answer, decoys, choiceCount: 6, rng: mulberry32(1) });
    expect(round.choices).toHaveLength(6);
  });
});
