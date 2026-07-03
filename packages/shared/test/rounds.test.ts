import { describe, expect, it } from 'vitest';
import { selectChoices } from '../src/rounds.js';
import { mulberry32 } from '../src/rng.js';

const answer = { quoteId: 1, text: 'Here is looking at you, kid.', movieId: 100 };

describe('selectChoices', () => {
  it('produces the requested number of distinct choices including the answer', () => {
    const decoys = [
      { quoteId: 2, text: 'We will always have Paris.', movieId: 200 },
      { quoteId: 3, text: 'Round up the usual suspects.', movieId: 300 },
      { quoteId: 4, text: 'I love the smell of napalm in the morning.', movieId: 400 },
    ];
    const round = selectChoices({ answer, decoys, choiceCount: 3, rng: mulberry32(42) });
    expect(round.choices).toHaveLength(3);
    expect(round.answerQuoteId).toBe(1);
    const ids = round.choices.map((c) => c.quoteId);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toContain(1);
  });

  it('never picks two decoys from the same film or the answer film', () => {
    const decoys = [
      { quoteId: 2, text: 'First line from film 200.', movieId: 200 },
      { quoteId: 3, text: 'Second line from film 200.', movieId: 200 },
      { quoteId: 4, text: 'A line from the answer film.', movieId: 100 },
      { quoteId: 5, text: 'Only line from film 300.', movieId: 300 },
    ];
    const round = selectChoices({ answer, decoys, choiceCount: 3, rng: mulberry32(7) });
    const movies = round.choices.map((c) => c.movieId).sort((a, b) => a - b);
    expect(movies).toEqual([100, 200, 300]);
  });

  it('skips near-duplicate decoys and the answer itself', () => {
    const decoys = [
      { quoteId: 1, text: 'Here is looking at you, kid.', movieId: 500 },
      { quoteId: 5, text: 'here is looking at you kid', movieId: 600 },
      { quoteId: 6, text: 'We will always have Paris.', movieId: 200 },
      { quoteId: 8, text: 'Round up the usual suspects.', movieId: 300 },
    ];
    const round = selectChoices({ answer, decoys, choiceCount: 3, rng: mulberry32(7) });
    const ids = round.choices.map((c) => c.quoteId).sort((a, b) => a - b);
    expect(ids).toEqual([1, 6, 8]);
  });

  it('throws when there are not enough usable decoys', () => {
    const decoys = [{ quoteId: 5, text: 'here is looking at you kid', movieId: 600 }];
    expect(() => selectChoices({ answer, decoys, choiceCount: 3 })).toThrow(/not enough/);
  });

  it('supports larger answer sizes from distinct films', () => {
    const decoys = Array.from({ length: 8 }, (_, i) => ({
      quoteId: 10 + i,
      text: `distinct decoy line number ${i}`,
      movieId: 1000 + i,
    }));
    const round = selectChoices({ answer, decoys, choiceCount: 6, rng: mulberry32(1) });
    expect(round.choices).toHaveLength(6);
    expect(new Set(round.choices.map((c) => c.movieId)).size).toBe(6);
  });
});
