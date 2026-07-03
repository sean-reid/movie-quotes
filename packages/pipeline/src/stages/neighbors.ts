import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DATA_DIR, NEIGHBORS_TOP_N, SIMILAR_FILMS } from '../config.js';
import type { MovieRecord, QuoteRecord } from '../types.js';
import { movieSimilarity } from '../util/movie-sim.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

export interface Neighbor {
  neighborId: number;
  score: number;
}

/**
 * For every quote, find its most similar quotes from OTHER films. To stay
 * tractable at scale, each quote is only compared against quotes from its film's
 * most-similar films (by genre/era/keyword). Vectors are unit-normalized, so
 * cosine is a dot product. This also biases decoys toward adjacent-world films.
 */
export async function neighbors(): Promise<void> {
  log.step('neighbors: nearest cross-film quotes (restricted to similar films)');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));
  const movies = await readJson<MovieRecord[]>(resolve(DATA_DIR, 'movies.json'));
  const meta = await readJson<{ dim: number; count: number }>(
    resolve(DATA_DIR, 'embeddings.meta.json'),
  );
  const buffer = await readFile(resolve(DATA_DIR, 'embeddings.bin'));
  const matrix = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );

  const n = quotes.length;
  const dim = meta.dim;
  const ids = Int32Array.from(quotes, (q) => q.id);
  const movieOf = Int32Array.from(quotes, (q) => q.movieId);
  const movieById = new Map(movies.map((m) => [m.id, m]));

  // Group quote rows by film.
  const rowsByFilm = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const arr = rowsByFilm.get(movieOf[i]!);
    if (arr) arr.push(i);
    else rowsByFilm.set(movieOf[i]!, [i]);
  }
  const filmIds = [...rowsByFilm.keys()];
  log.info(`films with quotes: ${filmIds.length}`);

  // Each film's most-similar films (candidates for its quotes' neighbors).
  const similarFilms = new Map<number, number[]>();
  for (const f of filmIds) {
    const fm = movieById.get(f);
    if (!fm) {
      similarFilms.set(f, []);
      continue;
    }
    const scored: { id: number; s: number }[] = [];
    for (const g of filmIds) {
      if (g === f) continue;
      const gm = movieById.get(g);
      if (!gm) continue;
      scored.push({ id: g, s: movieSimilarity(fm, gm) });
    }
    scored.sort((a, b) => b.s - a.s);
    similarFilms.set(
      f,
      scored.slice(0, SIMILAR_FILMS).map((x) => x.id),
    );
  }

  const result: Record<number, Neighbor[]> = {};
  const k = NEIGHBORS_TOP_N;
  const started = Date.now();
  let processed = 0;

  for (const f of filmIds) {
    // Candidate rows shared by every quote in this film.
    const candidates: number[] = [];
    for (const g of similarFilms.get(f)!) candidates.push(...rowsByFilm.get(g)!);

    for (const i of rowsByFilm.get(f)!) {
      const base = i * dim;
      const topScore = new Float64Array(k).fill(-Infinity);
      const topRow = new Int32Array(k).fill(-1);
      let minPos = 0;
      let minVal = -Infinity;

      for (const j of candidates) {
        const jb = j * dim;
        let s = 0;
        for (let d = 0; d < dim; d++) s += matrix[base + d]! * matrix[jb + d]!;
        if (s > minVal) {
          topScore[minPos] = s;
          topRow[minPos] = j;
          minVal = Infinity;
          for (let p = 0; p < k; p++) {
            if (topScore[p]! < minVal) {
              minVal = topScore[p]!;
              minPos = p;
            }
          }
        }
      }

      const pairs: Neighbor[] = [];
      for (let p = 0; p < k; p++) {
        if (topRow[p]! >= 0) pairs.push({ neighborId: ids[topRow[p]!]!, score: topScore[p]! });
      }
      pairs.sort((a, b) => b.score - a.score);
      result[ids[i]!] = pairs;

      if (++processed % 5000 === 0 || processed === n) {
        const elapsed = (Date.now() - started) / 1000;
        const eta = Math.round((n - processed) / (processed / elapsed));
        log.info(`neighbors ${processed}/${n} (${elapsed.toFixed(0)}s, ~${eta}s left)`);
      }
    }
  }

  await writeJson(resolve(DATA_DIR, 'neighbors.json'), result);
  log.info(`neighbors complete: top ${k} for ${n} quotes`);
}

neighbors().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
