import { resolve } from 'node:path';
import {
  bandForSimilarity,
  DEFAULT_CHOICE_COUNT,
  isNearDuplicate,
  type DecoyCandidate,
  type Round,
} from '@movie-quotes/shared';
import {
  DATA_DIR,
  DECOY_MOVIE_WEIGHT,
  DECOY_POOL_SIZE,
  DECOY_SEMANTIC_WEIGHT,
  MAX_ROUNDS,
} from '../config.js';
import type { MovieRecord, QuoteRecord } from '../types.js';
import { movieSimilarity } from '../util/movie-sim.js';
import type { Neighbor } from './neighbors.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

const DECOYS_NEEDED = DEFAULT_CHOICE_COUNT - 1;

export async function rounds(): Promise<void> {
  log.step('rounds: assemble pre-generated round pool');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));
  const movies = await readJson<MovieRecord[]>(resolve(DATA_DIR, 'movies.json'));
  const neighborMap = await readJson<Record<number, Neighbor[]>>(
    resolve(DATA_DIR, 'neighbors.json'),
  );

  const quoteById = new Map(quotes.map((q) => [q.id, q]));
  const movieById = new Map(movies.map((m) => [m.id, m]));

  const pool: Round[] = [];
  let nextId = 1;
  let skipped = 0;

  for (const answer of quotes) {
    const answerMovie = movieById.get(answer.movieId);
    if (!answerMovie) continue;
    const candidates = neighborMap[answer.id] ?? [];

    // Blend how similar the line reads with how similar the source film feels.
    const ranked = candidates
      .map((c) => {
        const decoyQuote = quoteById.get(c.neighborId);
        const decoyMovie = decoyQuote ? movieById.get(decoyQuote.movieId) : undefined;
        if (!decoyQuote || !decoyMovie) return null;
        const hardness =
          DECOY_SEMANTIC_WEIGHT * c.score +
          DECOY_MOVIE_WEIGHT * movieSimilarity(answerMovie, decoyMovie);
        return {
          quoteId: decoyQuote.id,
          text: decoyQuote.text,
          movieId: decoyQuote.movieId,
          score: hardness,
        };
      })
      .filter(
        (x): x is { quoteId: number; text: string; movieId: number; score: number } => x !== null,
      )
      .sort((a, b) => b.score - a.score);

    // Ranked, near-dup-guarded, one-decoy-per-film pool so any shown subset has
    // the answer and every decoy from a distinct movie.
    const decoyPool: DecoyCandidate[] = [];
    const kept: string[] = [];
    const usedFilms = new Set<number>([answer.movieId]);
    for (const candidate of ranked) {
      if (decoyPool.length === DECOY_POOL_SIZE) break;
      if (usedFilms.has(candidate.movieId)) continue;
      if (isNearDuplicate(candidate.text, answer.text)) continue;
      if (kept.some((t) => isNearDuplicate(t, candidate.text))) continue;
      decoyPool.push({ quoteId: candidate.quoteId, score: candidate.score });
      kept.push(candidate.text);
      usedFilms.add(candidate.movieId);
    }

    if (decoyPool.length < DECOYS_NEEDED) {
      skipped++;
      continue;
    }

    const shownScores = decoyPool.slice(0, DECOYS_NEEDED).map((d) => d.score);
    const avgSimilarity = shownScores.reduce((a, b) => a + b, 0) / shownScores.length;

    pool.push({
      id: nextId++,
      answerQuoteId: answer.id,
      movieId: answer.movieId,
      decade: answerMovie.decade,
      primaryGenreId: answerMovie.genreIds[0] ?? 0,
      band: bandForSimilarity(avgSimilarity),
      avgSimilarity,
      decoyPool,
    });
  }

  // Cap the pool (even sample to keep the era/genre/difficulty spread) so the D1
  // seed stays well under the free-tier write limit.
  let finalPool = pool;
  if (pool.length > MAX_ROUNDS) {
    const step = pool.length / MAX_ROUNDS;
    finalPool = Array.from({ length: MAX_ROUNDS }, (_, i) => pool[Math.floor(i * step)]!);
    log.info(`capping rounds ${pool.length} -> ${finalPool.length}`);
  }

  await writeJson(resolve(DATA_DIR, 'rounds.json'), finalPool);
  const bands = finalPool.reduce<Record<string, number>>((acc, r) => {
    acc[r.band] = (acc[r.band] ?? 0) + 1;
    return acc;
  }, {});
  log.info(
    `rounds complete: ${finalPool.length} rounds (${JSON.stringify(bands)}), ${skipped} skipped`,
  );
}

rounds().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
