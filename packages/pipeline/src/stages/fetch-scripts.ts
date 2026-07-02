import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DATA_DIR, SCRIPTS_DIR } from '../config.js';
import type { MovieRecord, ScriptRecord } from '../types.js';
import { politeFetchText } from '../util/http.js';
import { extractPre, findScriptLink, htmlToText } from '../util/html.js';
import { titleKey } from '../util/title.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

const IMSDB = 'https://imsdb.com';
const INDEX_URL = `${IMSDB}/all-scripts.html`;
const MIN_SCRIPT_CHARS = 3000;

interface IndexEntry {
  key: string;
  moviePageUrl: string;
}

/** Build a lookup from the IMSDb master list of scripts (one polite fetch). */
async function loadIndex(): Promise<Map<string, IndexEntry>> {
  const html = await politeFetchText(INDEX_URL);
  if (!html) throw new Error('could not load the IMSDb script index');

  const index = new Map<string, IndexEntry>();
  const anchor = /<a href="(\/Movie Scripts\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  for (const match of html.matchAll(anchor)) {
    const href = match[1]!;
    const title = match[2]!.trim();
    const key = titleKey(title);
    if (key && !index.has(key)) {
      index.set(key, { key, moviePageUrl: IMSDB + encodeURI(href) });
    }
  }
  log.info(`imsdb index: ${index.size} scripts`);
  return index;
}

function lookup(index: Map<string, IndexEntry>, title: string): IndexEntry | null {
  const key = titleKey(title);
  const exact = index.get(key);
  if (exact) return exact;
  // Fallback: an index title that starts with ours (e.g. "Star Wars: A New Hope").
  for (const entry of index.values()) {
    if (entry.key.startsWith(key) && key.length >= 5) return entry;
  }
  return null;
}

async function fetchScript(entry: IndexEntry): Promise<string | null> {
  const moviePage = await politeFetchText(entry.moviePageUrl);
  if (!moviePage) return null;
  const scriptHref = findScriptLink(moviePage);
  if (!scriptHref) return null;

  const scriptPage = await politeFetchText(IMSDB + encodeURI(scriptHref));
  if (!scriptPage) return null;

  const pre = extractPre(scriptPage);
  if (!pre) return null;
  const text = htmlToText(pre).trim();
  return text.length >= MIN_SCRIPT_CHARS ? text : null;
}

export async function fetchScripts(): Promise<void> {
  log.step('fetch-scripts: locate and download screenplays');
  const movies = await readJson<MovieRecord[]>(resolve(DATA_DIR, 'movies.json'));
  const index = await loadIndex();
  await mkdir(SCRIPTS_DIR, { recursive: true });

  const scripts: ScriptRecord[] = [];
  let misses = 0;

  for (const movie of movies) {
    const entry = lookup(index, movie.title);
    if (!entry) {
      misses++;
      log.warn(`no script listed for ${movie.title} (${movie.year})`);
      continue;
    }
    const text = await fetchScript(entry);
    if (!text) {
      misses++;
      log.warn(`could not extract script for ${movie.title} (${movie.year})`);
      continue;
    }
    await writeFile(resolve(SCRIPTS_DIR, `${movie.id}.txt`), text, 'utf8');
    scripts.push({
      movieId: movie.id,
      source: 'imsdb',
      r2Key: `raw/${movie.id}.txt`,
      chars: text.length,
    });
    log.info(`saved ${movie.title} (${text.length} chars)`);
  }

  await writeJson(resolve(DATA_DIR, 'scripts.json'), scripts);
  log.info(`fetch-scripts complete: ${scripts.length} scripts, ${misses} misses`);
}

fetchScripts().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
