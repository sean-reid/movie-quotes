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
 * For every quote, find its most similar quotes from OTHER films. Embeddings are
 * unit-normalized, so cosine similarity is a dot product. Brute force is fine at
 * fixture scale; swap in an ANN index if the corpus grows very large.
 */
export async function neighbors(): Promise<void> {
  log.step('neighbors: nearest cross-film quotes');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));
  const embeddings = await readJson<Record<number, number[]>>(resolve(DATA_DIR, 'embeddings.json'));

  const ids = quotes.map((q) => q.id);
  const movieOf = new Map(quotes.map((q) => [q.id, q.movieId]));
  const vectors = new Map(ids.map((id) => [id, Float32Array.from(embeddings[id]!)]));

  const result: Record<number, Neighbor[]> = {};

  for (const id of ids) {
    const vec = vectors.get(id)!;
    const movie = movieOf.get(id);
    const scored: Neighbor[] = [];

    for (const other of ids) {
      if (other === id || movieOf.get(other) === movie) continue;
      scored.push({ neighborId: other, score: dot(vec, vectors.get(other)!) });
    }

    scored.sort((a, b) => b.score - a.score);
    result[id] = scored.slice(0, NEIGHBORS_TOP_N);
  }

  await writeJson(resolve(DATA_DIR, 'neighbors.json'), result);
  log.info(`neighbors complete: top ${NEIGHBORS_TOP_N} for ${ids.length} quotes`);
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i]! * b[i]!;
  return sum;
}

neighbors().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
