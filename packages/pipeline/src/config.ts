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
  1950: 30,
  1960: 40,
  1970: 60,
  1980: 100,
  1990: 130,
  2000: 140,
  2010: 160,
  2020: 90,
};

/**
 * Politeness toward the TMDb API. We stay well under their limits: requests are
 * spaced out, responses are cached on disk so re-runs do not re-hit the API, and
 * throttling responses trigger a backoff that honors Retry-After.
 */
export const TMDB_REQUEST_INTERVAL_MS = 300;
export const TMDB_MAX_RETRIES = 6;
export const TMDB_BACKOFF_BASE_MS = 1000;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in the repo .env.`);
  }
  return value;
}
