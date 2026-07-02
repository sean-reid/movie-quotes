import {
  DECADE_SPAN_YEARS,
  MOVIE_SIM_DECADE_WEIGHT,
  MOVIE_SIM_GENRE_WEIGHT,
  MOVIE_SIM_KEYWORD_WEIGHT,
} from '../config.js';

export interface MovieLike {
  decade: number;
  genreIds: number[];
  keywordIds: number[];
}

export function jaccard(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setB = new Set(b);
  let intersection = 0;
  for (const x of new Set(a)) {
    if (setB.has(x)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/** 1 for the same decade, decaying to 0 at DECADE_SPAN_YEARS apart. */
export function decadeProximity(a: number, b: number): number {
  return Math.max(0, 1 - Math.abs(a - b) / DECADE_SPAN_YEARS);
}

/**
 * How similar two films feel, in [0, 1]: shared genres, closeness in era, and
 * shared thematic keywords. A rough scorer by design.
 */
export function movieSimilarity(a: MovieLike, b: MovieLike): number {
  const genre = jaccard(a.genreIds, b.genreIds);
  const decade = decadeProximity(a.decade, b.decade);
  const keyword = jaccard(a.keywordIds, b.keywordIds);
  const weighted =
    MOVIE_SIM_GENRE_WEIGHT * genre +
    MOVIE_SIM_DECADE_WEIGHT * decade +
    MOVIE_SIM_KEYWORD_WEIGHT * keyword;
  const total = MOVIE_SIM_GENRE_WEIGHT + MOVIE_SIM_DECADE_WEIGHT + MOVIE_SIM_KEYWORD_WEIGHT;
  return weighted / total;
}
