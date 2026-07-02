import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CACHE_DIR } from '../config.js';
import { log, sleep } from './log.js';

const TEXT_CACHE = resolve(CACHE_DIR, 'http');
const MIN_INTERVAL_MS = 800;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

/** Per-host last-request timestamps so we are gentle with every site we touch. */
const lastByHost = new Map<string, number>();

async function throttle(host: string): Promise<void> {
  const last = lastByHost.get(host) ?? 0;
  const wait = Math.max(0, last + MIN_INTERVAL_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastByHost.set(host, Date.now());
}

function keyFor(url: string): string {
  return createHash('sha1').update(url).digest('hex');
}

async function readCache(key: string): Promise<string | null> {
  try {
    return await readFile(resolve(TEXT_CACHE, `${key}.html`), 'utf8');
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: string): Promise<void> {
  await mkdir(TEXT_CACHE, { recursive: true });
  await writeFile(resolve(TEXT_CACHE, `${key}.html`), value, 'utf8');
}

/**
 * Fetch a URL as text with the same manners as the TMDb client: on-disk cache,
 * per-host throttling, and backoff on throttling or server errors. Returns null
 * on a 404 so callers can treat a missing script as a miss rather than a crash.
 */
export async function politeFetchText(url: string): Promise<string | null> {
  const key = keyFor(url);
  const cached = await readCache(key);
  if (cached !== null) return cached;

  const host = new URL(url).host;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle(host);
    const response = await fetch(url, {
      headers: {
        'user-agent': 'movie-quotes-pipeline/0.1 (personal project)',
        accept: 'text/html,application/xhtml+xml',
      },
    });

    if (response.ok) {
      const body = await response.text();
      await writeCache(key, body);
      return body;
    }

    if (response.status === 404) return null;

    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const backoff = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : BACKOFF_BASE_MS * 2 ** attempt;
      log.warn(`http ${response.status} on ${host}, backing off ${backoff}ms`);
      await sleep(backoff);
      continue;
    }

    throw new Error(`fetch failed: ${response.status} ${url}`);
  }

  throw new Error(`fetch exhausted retries: ${url}`);
}
