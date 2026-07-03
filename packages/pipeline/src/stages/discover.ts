import { resolve } from 'node:path';
import { DATA_DIR, DECADE_QUOTAS, MIN_RATING, MIN_VOTES } from '../config.js';
import { discoverMovies, fetchGenres, fetchKeywords } from '../tmdb.js';
import type { GenreRecord, MovieRecord } from '../types.js';
import { log } from '../util/log.js';
import { writeJson } from '../util/fs.js';

/** When SAMPLE is set, take a tiny slice per decade for local dev and CI. */
const SAMPLE = process.env.SAMPLE ? Number(process.env.SAMPLE) : 0;

function decadeOf(releaseDate: string | undefined): number | null {
  if (!releaseDate) return null;
  const year = Number(releaseDate.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return Math.floor(year / 10) * 10;
}

async function collectDecade(decade: number, quota: number): Promise<MovieRecord[]> {
  const collected = new Map<number, MovieRecord>();
  const maxPages = Math.ceil(quota / 20) + 3;

  for (let page = 1; page <= maxPages && collected.size < quota; page++) {
    const result = await discoverMovies({
      sort_by: 'vote_count.desc',
      'vote_count.gte': String(MIN_VOTES),
      'vote_average.gte': String(MIN_RATING),
      'primary_release_date.gte': `${decade}-01-01`,
      'primary_release_date.lte': `${decade + 9}-12-31`,
      page: String(page),
      with_original_language: 'en',
    });

    for (const movie of result.results) {
      if (collected.size >= quota) break;
      if (decadeOf(movie.release_date) !== decade) continue;
      if (collected.has(movie.id)) continue;
      collected.set(movie.id, {
        id: movie.id,
        title: movie.title,
        year: Number(movie.release_date!.slice(0, 4)),
        decade,
        tmdbRating: movie.vote_average,
        tmdbVotes: movie.vote_count,
        posterPath: movie.poster_path,
        genreIds: movie.genre_ids,
        keywordIds: [],
      });
    }

    if (page >= result.total_pages) break;
  }

  log.info(`${decade}s: ${collected.size}/${quota} films`);
  return [...collected.values()];
}

export async function discover(): Promise<void> {
  log.step('discover: films from TMDb');

  const genres = await fetchGenres();
  const genreRecords: GenreRecord[] = genres.map((g) => ({ id: g.id, name: g.name }));
  await writeJson(resolve(DATA_DIR, 'genres.json'), genreRecords);
  log.info(`genres: ${genreRecords.length}`);

  const movies: MovieRecord[] = [];
  for (const [decadeStr, quota] of Object.entries(DECADE_QUOTAS)) {
    const decade = Number(decadeStr);
    // In SAMPLE mode, SAMPLE is films-per-decade so the sample still spans eras.
    const target = SAMPLE ? Math.min(SAMPLE, quota) : quota;
    movies.push(...(await collectDecade(decade, target)));
  }

  log.info(`fetching thematic keywords for ${movies.length} films`);
  // Concurrency is bounded inside the TMDb client.
  await Promise.all(
    movies.map(async (movie) => {
      movie.keywordIds = await fetchKeywords(movie.id);
    }),
  );

  await writeJson(resolve(DATA_DIR, 'movies.json'), movies);
  log.info(
    `discover complete: ${movies.length} films across ${Object.keys(DECADE_QUOTAS).length} decades`,
  );
}

discover().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
