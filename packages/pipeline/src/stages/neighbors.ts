import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DATA_DIR, NEIGHBORS_TOP_N } from '../config.js';
import type { QuoteRecord } from '../types.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

export interface Neighbor {
  neighborId: number;
  score: number;
}

/**
 * For every quote, find its most similar quotes from OTHER films. Vectors are
 * unit-normalized so cosine similarity is a dot product. This is a dependency-free
 * brute force over a contiguous Float32 matrix with a per-row top-K; fine for a
 * one-time offline build at tens of thousands of quotes.
 */
export async function neighbors(): Promise<void> {
  log.step('neighbors: nearest cross-film quotes');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));
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
  const movieIds = Int32Array.from(quotes, (q) => q.movieId);
  const k = NEIGHBORS_TOP_N;

  const result: Record<number, Neighbor[]> = {};
  const topScore = new Float64Array(k);
  const topIdx = new Int32Array(k);
  const started = Date.now();

  for (let i = 0; i < n; i++) {
    topScore.fill(-Infinity);
    topIdx.fill(-1);
    let minPos = 0;
    let minVal = -Infinity;
    const base = i * dim;
    const movie = movieIds[i];

    for (let j = 0; j < n; j++) {
      if (j === i || movieIds[j] === movie) continue;
      const jb = j * dim;
      let s = 0;
      for (let d = 0; d < dim; d++) s += matrix[base + d]! * matrix[jb + d]!;
      if (s > minVal) {
        topScore[minPos] = s;
        topIdx[minPos] = j;
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
      if (topIdx[p]! >= 0) pairs.push({ neighborId: ids[topIdx[p]!]!, score: topScore[p]! });
    }
    pairs.sort((a, b) => b.score - a.score);
    result[ids[i]!] = pairs;

    if ((i + 1) % 2000 === 0 || i + 1 === n) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = (i + 1) / elapsed;
      const eta = Math.round((n - i - 1) / rate);
      log.info(`neighbors ${i + 1}/${n} (${elapsed.toFixed(0)}s elapsed, ~${eta}s left)`);
    }
  }

  await writeJson(resolve(DATA_DIR, 'neighbors.json'), result);
  log.info(`neighbors complete: top ${k} for ${n} quotes`);
}

neighbors().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
