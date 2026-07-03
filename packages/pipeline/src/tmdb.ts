import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CACHE_DIR, TMDB_BACKOFF_BASE_MS, TMDB_MAX_RETRIES, requireEnv } from './config.js';
import { hostLimiter } from './util/limiter.js';
import { log, sleep } from './util/log.js';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_CACHE = resolve(CACHE_DIR, 'tmdb');
// TMDb tolerates high throughput; a modest concurrency keeps us fast and safe.
const TMDB_CONCURRENCY = 8;

function cacheKey(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return createHash('sha1').update(`${path}?${query}`).digest('hex');
}

async function readCache(key: string): Promise<unknown | null> {
  try {
    const raw = await readFile(resolve(TMDB_CACHE, `${key}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  await mkdir(TMDB_CACHE, { recursive: true });
  await writeFile(resolve(TMDB_CACHE, `${key}.json`), JSON.stringify(value), 'utf8');
}

/**
 * GET a TMDb endpoint as JSON. Responses are cached on disk (so repeat runs and
 * CI never re-hit the API), requests are throttled, and throttling or transient
 * server errors are retried with backoff that respects Retry-After.
 */
export async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = requireEnv('TMDB_API_KEY');
  const key = cacheKey(path, params);

  const cached = await readCache(key);
  if (cached !== null) return cached as T;

  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries({ ...params, api_key: apiKey })) {
    url.searchParams.set(k, v);
  }

  return hostLimiter(
    'api.themoviedb.org',
    TMDB_CONCURRENCY,
  )(async () => {
    for (let attempt = 0; attempt <= TMDB_MAX_RETRIES; attempt++) {
      const response = await fetch(url, { headers: { accept: 'application/json' } });

      if (response.ok) {
        const body = (await response.json()) as T;
        await writeCache(key, body);
        return body;
      }

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('retry-after'));
        const backoff = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : TMDB_BACKOFF_BASE_MS * 2 ** attempt;
        log.warn(`tmdb ${response.status} on ${path}, backing off ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      throw new Error(`TMDb request failed: ${response.status} ${path}`);
    }
    throw new Error(`TMDb request exhausted retries: ${path}`);
  });
}

export interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  genre_ids: number[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export async function fetchGenres(): Promise<TmdbGenre[]> {
  const data = await tmdbGet<{ genres: TmdbGenre[] }>('/genre/movie/list', { language: 'en-US' });
  return data.genres;
}

/** Thematic keyword ids for a film (e.g. heist, dystopia), used for movie similarity. */
export async function fetchKeywords(movieId: number): Promise<number[]> {
  const data = await tmdbGet<{ keywords?: { id: number; name: string }[] }>(
    `/movie/${movieId}/keywords`,
  );
  return (data.keywords ?? []).map((k) => k.id);
}

export interface DiscoverPage {
  page: number;
  total_pages: number;
  results: TmdbMovie[];
}

export function discoverMovies(params: Record<string, string>): Promise<DiscoverPage> {
  return tmdbGet<DiscoverPage>('/discover/movie', {
    language: 'en-US',
    include_adult: 'false',
    ...params,
  });
}
