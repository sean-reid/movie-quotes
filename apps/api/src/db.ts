import type { DecoyCandidate, DifficultyBand } from '@movie-quotes/shared';

export interface RoundRow {
  id: number;
  answerQuoteId: number;
  movieId: number;
  band: DifficultyBand;
  decoyPool: DecoyCandidate[];
}

export interface QuoteRow {
  id: number;
  movieId: number;
  text: string;
}

export interface MovieRow {
  id: number;
  title: string;
  year: number;
  posterPath: string | null;
}

export interface RoundFilters {
  band?: DifficultyBand;
  genreId?: number;
  decade?: number;
  excludeRounds?: number[];
  excludeMovies?: number[];
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}

/** Pick a random round matching the filters. Falls back to any band if the requested band is empty. */
export async function selectRandomRound(
  db: D1Database,
  filters: RoundFilters,
): Promise<RoundRow | null> {
  const round = await queryRandomRound(db, filters);
  if (round || !filters.band) return round;
  // Never dead-end: if the requested difficulty has nothing left, drop it.
  return queryRandomRound(db, { ...filters, band: undefined });
}

async function queryRandomRound(db: D1Database, filters: RoundFilters): Promise<RoundRow | null> {
  const clauses: string[] = ['1 = 1'];
  const binds: unknown[] = [];

  if (filters.band) {
    clauses.push('band = ?');
    binds.push(filters.band);
  }
  if (filters.decade !== undefined) {
    clauses.push('decade = ?');
    binds.push(filters.decade);
  }
  if (filters.genreId !== undefined) {
    clauses.push('movie_id IN (SELECT movie_id FROM movie_genres WHERE genre_id = ?)');
    binds.push(filters.genreId);
  }
  if (filters.excludeRounds?.length) {
    clauses.push(`id NOT IN (${placeholders(filters.excludeRounds.length)})`);
    binds.push(...filters.excludeRounds);
  }
  if (filters.excludeMovies?.length) {
    clauses.push(`movie_id NOT IN (${placeholders(filters.excludeMovies.length)})`);
    binds.push(...filters.excludeMovies);
  }

  const sql = `SELECT id, answer_quote_id, movie_id, band, decoy_pool
    FROM rounds WHERE ${clauses.join(' AND ')} ORDER BY RANDOM() LIMIT 1`;

  const row = await db
    .prepare(sql)
    .bind(...binds)
    .first<{
      id: number;
      answer_quote_id: number;
      movie_id: number;
      band: DifficultyBand;
      decoy_pool: string;
    }>();

  if (!row) return null;
  return {
    id: row.id,
    answerQuoteId: row.answer_quote_id,
    movieId: row.movie_id,
    band: row.band,
    decoyPool: JSON.parse(row.decoy_pool) as DecoyCandidate[],
  };
}

export async function getRoundById(db: D1Database, id: number): Promise<RoundRow | null> {
  const row = await db
    .prepare('SELECT id, answer_quote_id, movie_id, band, decoy_pool FROM rounds WHERE id = ?')
    .bind(id)
    .first<{
      id: number;
      answer_quote_id: number;
      movie_id: number;
      band: DifficultyBand;
      decoy_pool: string;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    answerQuoteId: row.answer_quote_id,
    movieId: row.movie_id,
    band: row.band,
    decoyPool: JSON.parse(row.decoy_pool) as DecoyCandidate[],
  };
}

export async function getQuotes(db: D1Database, ids: number[]): Promise<Map<number, QuoteRow>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .prepare(`SELECT id, movie_id, text FROM quotes WHERE id IN (${placeholders(ids.length)})`)
    .bind(...ids)
    .all<{ id: number; movie_id: number; text: string }>();
  return new Map(rows.results.map((r) => [r.id, { id: r.id, movieId: r.movie_id, text: r.text }]));
}

export async function getMovie(db: D1Database, id: number): Promise<MovieRow | null> {
  const row = await db
    .prepare('SELECT id, title, year, poster_path FROM movies WHERE id = ?')
    .bind(id)
    .first<{ id: number; title: string; year: number; poster_path: string | null }>();
  if (!row) return null;
  return { id: row.id, title: row.title, year: row.year, posterPath: row.poster_path };
}

export async function getMovies(db: D1Database, ids: number[]): Promise<Map<number, MovieRow>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .prepare(
      `SELECT id, title, year, poster_path FROM movies WHERE id IN (${placeholders(ids.length)})`,
    )
    .bind(...ids)
    .all<{ id: number; title: string; year: number; poster_path: string | null }>();
  return new Map(
    rows.results.map((r) => [
      r.id,
      { id: r.id, title: r.title, year: r.year, posterPath: r.poster_path },
    ]),
  );
}

export interface Meta {
  genres: { id: number; name: string }[];
  decades: number[];
}

/** Genres and decades that actually have rounds, for the filter UI. */
export async function getMeta(db: D1Database): Promise<Meta> {
  const genres = await db
    .prepare(
      `SELECT DISTINCT g.id, g.name FROM genres g
       JOIN movie_genres mg ON mg.genre_id = g.id
       JOIN rounds r ON r.movie_id = mg.movie_id
       ORDER BY g.name`,
    )
    .all<{ id: number; name: string }>();
  const decades = await db
    .prepare('SELECT DISTINCT decade FROM rounds ORDER BY decade')
    .all<{ decade: number }>();
  return {
    genres: genres.results,
    decades: decades.results.map((d) => d.decade),
  };
}
