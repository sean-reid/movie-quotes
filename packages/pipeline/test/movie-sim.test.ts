import { describe, expect, it } from 'vitest';
import { decadeProximity, jaccard, movieSimilarity } from '../src/util/movie-sim.js';

describe('jaccard', () => {
  it('is 1 for identical sets and 0 for disjoint', () => {
    expect(jaccard([1, 2, 3], [3, 2, 1])).toBe(1);
    expect(jaccard([1, 2], [3, 4])).toBe(0);
  });

  it('handles partial overlap', () => {
    expect(jaccard([1, 2, 3], [2, 3, 4])).toBe(0.5);
  });

  it('is 0 when both are empty', () => {
    expect(jaccard([], [])).toBe(0);
  });
});

describe('decadeProximity', () => {
  it('is 1 for the same decade', () => {
    expect(decadeProximity(1970, 1970)).toBe(1);
  });

  it('decays with distance and floors at 0', () => {
    expect(decadeProximity(1970, 1990)).toBeCloseTo(0.5);
    expect(decadeProximity(1950, 2020)).toBe(0);
  });
});

describe('movieSimilarity', () => {
  const godfather = { decade: 1970, genreIds: [80, 18], keywordIds: [1, 2, 3] };

  it('rates a same-genre, same-era, same-theme film higher than a distant one', () => {
    const goodfellas = { decade: 1990, genreIds: [80, 18], keywordIds: [1, 2, 9] };
    const toyStory = { decade: 1990, genreIds: [16, 35], keywordIds: [50, 51] };
    expect(movieSimilarity(godfather, goodfellas)).toBeGreaterThan(
      movieSimilarity(godfather, toyStory),
    );
  });

  it('returns a value in [0, 1]', () => {
    const other = { decade: 2020, genreIds: [28], keywordIds: [99] };
    const score = movieSimilarity(godfather, other);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
