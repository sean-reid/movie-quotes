import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DATA_DIR, SCRIPTS_DIR } from '../config.js';
import type { MovieRecord, ScriptRecord } from '../types.js';
import { springfieldSource, type Source } from '../sources.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

/**
 * Resume support: prefer scripts.json (records source and kind); fall back to
 * scanning saved files. Old records without a kind are IMSDb screenplays.
 */
async function loadProgress(): Promise<ScriptRecord[]> {
  try {
    const prior = await readJson<ScriptRecord[]>(resolve(DATA_DIR, 'scripts.json'));
    const kept: ScriptRecord[] = [];
    for (const r of prior) {
      try {
        await stat(resolve(SCRIPTS_DIR, `${r.movieId}.txt`));
        kept.push({ ...r, kind: r.kind ?? 'screenplay' });
      } catch {
        // file gone; will be re-fetched
      }
    }
    if (kept.length) return kept;
  } catch {
    // no scripts.json yet
  }
  try {
    const files = await readdir(SCRIPTS_DIR);
    const recs: ScriptRecord[] = [];
    for (const f of files) {
      if (!f.endsWith('.txt')) continue;
      const id = Number(f.replace('.txt', ''));
      if (!Number.isInteger(id)) continue;
      const { size } = await stat(resolve(SCRIPTS_DIR, f));
      recs.push({
        movieId: id,
        source: 'imsdb',
        kind: 'screenplay',
        r2Key: `raw/${id}.txt`,
        chars: size,
      });
    }
    return recs;
  } catch {
    return [];
  }
}

export async function fetchScripts(): Promise<void> {
  log.step('fetch-scripts: locate and download scripts');
  const movies = await readJson<MovieRecord[]>(resolve(DATA_DIR, 'movies.json'));
  await mkdir(SCRIPTS_DIR, { recursive: true });

  const scripts = await loadProgress();
  // "attempted" tracks every film we have tried (found or missed) so batches
  // advance past misses instead of retrying the same ones.
  let attempted: number[] = [];
  try {
    attempted = await readJson<number[]>(resolve(DATA_DIR, 'attempted.json'));
  } catch {
    attempted = scripts.map((s) => s.movieId);
  }
  const done = new Set([...attempted, ...scripts.map((s) => s.movieId)]);
  if (done.size > 0) log.info(`resuming: ${scripts.length} found, ${done.size} attempted`);

  // Springfield only: dialogue-only transcripts. Screenplay sources leak scene
  // description/action lines, so we do not use them.
  const sources: Source[] = [springfieldSource()];
  for (const source of sources) await source.init();

  // Optional per-run batch size (this pipeline is resumable), default: everything.
  const batch = process.env.BATCH ? Number(process.env.BATCH) : Infinity;
  const pending = movies.filter((m) => !done.has(m.id)).slice(0, batch);
  const CHUNK = 8;
  let misses = 0;

  for (let start = 0; start < pending.length; start += CHUNK) {
    const chunk = pending.slice(start, start + CHUNK);
    // Films run concurrently; the HTTP client bounds actual per-host concurrency.
    const found = await Promise.all(
      chunk.map(async (movie) => {
        for (const source of sources) {
          const result = await source.fetch(movie);
          if (result) return { movie, result };
        }
        return { movie, result: null };
      }),
    );

    for (const { movie, result } of found) {
      attempted.push(movie.id);
      if (!result) {
        misses++;
        continue;
      }
      await writeFile(resolve(SCRIPTS_DIR, `${movie.id}.txt`), result.text, 'utf8');
      scripts.push({
        movieId: movie.id,
        source: result.source,
        kind: result.kind,
        r2Key: `raw/${movie.id}.txt`,
        chars: result.text.length,
      });
    }
    // Persist progress once per chunk so an interrupted run resumes cleanly.
    await writeJson(resolve(DATA_DIR, 'scripts.json'), scripts);
    await writeJson(resolve(DATA_DIR, 'attempted.json'), attempted);
    log.info(
      `fetch-scripts ${Math.min(start + CHUNK, pending.length)}/${pending.length} (${scripts.length} found)`,
    );
  }

  await writeJson(resolve(DATA_DIR, 'scripts.json'), scripts);
  const bySource = scripts.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] ?? 0) + 1;
    return acc;
  }, {});
  log.info(
    `fetch-scripts complete: ${scripts.length} scripts (${JSON.stringify(bySource)}), ${misses} misses`,
  );
}

fetchScripts().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
