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
  1950: 40,
  1960: 55,
  1970: 80,
  1980: 130,
  1990: 175,
  2000: 185,
  2010: 210,
  2020: 125,
};

/**
 * Politeness toward the TMDb API. We stay well under their limits: requests are
 * spaced out, responses are cached on disk so re-runs do not re-hit the API, and
 * throttling responses trigger a backoff that honors Retry-After.
 */
export const TMDB_REQUEST_INTERVAL_MS = 300;
export const TMDB_MAX_RETRIES = 6;
export const TMDB_BACKOFF_BASE_MS = 1000;

/** Local sentence-embedding model (downloaded once, then cached and offline). */
export const EMBED_MODEL = 'Xenova/bge-small-en-v1.5';

/** How many nearest semantic neighbors to precompute per quote. */
export const NEIGHBORS_TOP_N = 20;

/** How many ranked decoys to keep per round, so answer size can grow later. */
export const DECOY_POOL_SIZE = 8;

/**
 * Cap on the pre-generated round pool. Keeps the D1 seed well under the free-tier
 * daily write limit while still offering far more variety than anyone will play.
 */
export const MAX_ROUNDS = 20000;

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
