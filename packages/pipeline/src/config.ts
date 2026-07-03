import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Package root (packages/pipeline). */
export const PKG_ROOT = resolve(here, '..');
export const DATA_DIR = resolve(PKG_ROOT, 'data');
export const CACHE_DIR = resolve(DATA_DIR, 'cache');
export const SCRIPTS_DIR = resolve(DATA_DIR, 'scripts');
export const FIXTURES_DIR = resolve(PKG_ROOT, 'fixtures');

/** Popularity bar: a film must clear both to be considered. */
export const MIN_VOTES = 1000;
export const MIN_RATING = 6.5;

/**
 * Target film count per decade. Sums to ~750 and keeps a healthy pre-1980 share
 * (about 17%) so the corpus is not all recent releases.
 */
export const DECADE_QUOTAS: Record<number, number> = {
  1950: 200,
  1960: 280,
  1970: 400,
  1980: 650,
  1990: 850,
  2000: 900,
  2010: 1000,
  2020: 720,
};

/**
 * Politeness toward the TMDb API: bounded concurrency, responses cached on disk
 * so re-runs do not re-hit the API, and backoff that honors Retry-After.
 */
export const TMDB_MAX_RETRIES = 6;
export const TMDB_BACKOFF_BASE_MS = 1000;

/** Local sentence-embedding model (downloaded once, then cached and offline). */
export const EMBED_MODEL = 'Xenova/bge-small-en-v1.5';

/** How many nearest semantic neighbors to precompute per quote. */
export const NEIGHBORS_TOP_N = 20;

/**
 * Neighbor search is restricted to quotes from each film's most-similar films.
 * This makes the O(N^2) search tractable at scale and biases decoys toward
 * adjacent-world films (a quality win, not just a speedup).
 */
export const SIMILAR_FILMS = 60;

/** How many ranked decoys to keep per round, so answer size can grow later. */
export const DECOY_POOL_SIZE = 8;

/**
 * Cap on the pre-generated round pool. Set high (roughly one round per quote) so
 * exact-repeat rounds are very unlikely across games. Writes are cheap on the
 * Workers Paid plan; runtime selection uses a random-id lookup, not a full scan.
 */
export const MAX_ROUNDS = 250000;

/**
 * Decoy hardness blends how similar the line reads (semantic) with how similar
 * the source film feels (genre, era, theme). A line that is both on-topic and
 * from an adjacent film is the hardest to rule out.
 */
export const DECOY_SEMANTIC_WEIGHT = 0.7;
export const DECOY_MOVIE_WEIGHT = 0.3;

/** Weights inside the movie-similarity score (normalized by their sum). */
export const MOVIE_SIM_GENRE_WEIGHT = 0.5;
export const MOVIE_SIM_DECADE_WEIGHT = 0.2;
export const MOVIE_SIM_KEYWORD_WEIGHT = 0.3;

/** Two films this many years apart score zero on decade proximity. */
export const DECADE_SPAN_YEARS = 40;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in the repo .env.`);
  }
  return value;
}
