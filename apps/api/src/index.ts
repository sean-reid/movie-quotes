import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  DEFAULT_CHOICE_COUNT,
  mulberry32,
  scoreGuess,
  selectChoices,
  type Choice,
  type DifficultyBand,
  type GuessResult,
  type RoundView,
} from '@movie-quotes/shared';
import type { Env } from './env.js';
import {
  getMovie,
  getMovies,
  getMeta,
  getQuotes,
  getRoundById,
  selectRandomRound,
  type RoundRow,
} from './db.js';

const app = new Hono<{ Bindings: Env }>();

const BANDS = new Set<DifficultyBand>(['easy', 'medium', 'hard']);

function parseIntParam(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : undefined;
}

function parseIntList(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));
}

/** Build the client-facing view of a round (answer hidden, choices shuffled deterministically). */
async function assembleView(env: Env, round: RoundRow): Promise<RoundView | null> {
  const decoyIds = round.decoyPool.slice(0, DEFAULT_CHOICE_COUNT - 1).map((d) => d.quoteId);
  const quotes = await getQuotes(env.DB, [round.answerQuoteId, ...decoyIds]);
  const answer = quotes.get(round.answerQuoteId);
  const movie = await getMovie(env.DB, round.movieId);
  if (!answer || !movie) return null;

  const decoys = decoyIds
    .map((id) => quotes.get(id))
    .filter((q): q is NonNullable<typeof q> => q !== undefined)
    .map((q) => ({ quoteId: q.id, text: q.text }));

  try {
    const assembled = selectChoices({
      answer: { quoteId: answer.id, text: answer.text },
      decoys,
      choiceCount: DEFAULT_CHOICE_COUNT,
      rng: mulberry32(round.id),
    });
    const choices: Choice[] = assembled.choices.map((ch) => ({
      choiceId: ch.quoteId,
      text: ch.text,
    }));
    return {
      roundId: round.id,
      band: round.band,
      film: { id: movie.id, title: movie.title, year: movie.year },
      choices,
    };
  } catch {
    return null;
  }
}

app.use('/api/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : (allowed[0] ?? null)),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })(c, next);
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.get('/api/meta', async (c) => {
  const meta = await getMeta(c.env.DB);
  return c.json(meta);
});

app.get('/api/round', async (c) => {
  const difficulty = c.req.query('difficulty');
  const band =
    difficulty && BANDS.has(difficulty as DifficultyBand)
      ? (difficulty as DifficultyBand)
      : undefined;

  const round = await selectRandomRound(c.env.DB, {
    band,
    genreId: parseIntParam(c.req.query('genre')),
    decade: parseIntParam(c.req.query('decade')),
    excludeRounds: parseIntList(c.req.query('excludeRounds')),
    excludeMovies: parseIntList(c.req.query('excludeMovies')),
  });
  if (!round) return c.json({ error: 'no matching round' }, 404);

  const view = await assembleView(c.env, round);
  if (!view) return c.json({ error: 'round data missing' }, 500);
  return c.json(view);
});

// Fetch a specific round by id, used to replay a shared challenge.
app.get('/api/round/:id', async (c) => {
  const id = parseIntParam(c.req.param('id'));
  if (id === undefined) return c.json({ error: 'invalid round id' }, 400);
  const round = await getRoundById(c.env.DB, id);
  if (!round) return c.json({ error: 'round not found' }, 404);
  const view = await assembleView(c.env, round);
  if (!view) return c.json({ error: 'round data missing' }, 500);
  return c.json(view);
});

app.post('/api/round/:id/guess', async (c) => {
  const roundId = parseIntParam(c.req.param('id'));
  if (roundId === undefined) return c.json({ error: 'invalid round id' }, 400);

  const body = await c.req.json<{ choiceId?: number; elapsedMs?: number; priorStreak?: number }>();
  const choiceId = body.choiceId;
  if (!Number.isInteger(choiceId)) return c.json({ error: 'invalid choiceId' }, 400);
  const elapsedMs = Number.isFinite(body.elapsedMs) ? Math.max(0, body.elapsedMs!) : 0;
  const priorStreak = Number.isInteger(body.priorStreak) ? Math.max(0, body.priorStreak!) : 0;

  const round = await getRoundById(c.env.DB, roundId);
  if (!round) return c.json({ error: 'round not found' }, 404);

  const correct = choiceId === round.answerQuoteId;
  const score = scoreGuess({ correct, band: round.band, elapsedMs, priorStreak });

  const movie = await getMovie(c.env.DB, round.movieId);
  if (!movie) return c.json({ error: 'round data missing' }, 500);

  const decoyIds = round.decoyPool.slice(0, DEFAULT_CHOICE_COUNT - 1).map((d) => d.quoteId);
  const decoyQuotes = await getQuotes(c.env.DB, decoyIds);
  const decoyMovieIds = [...new Set([...decoyQuotes.values()].map((q) => q.movieId))];
  const decoyMovies = await getMovies(c.env.DB, decoyMovieIds);
  const decoySources = [...decoyMovies.values()].map((m) => ({ title: m.title, year: m.year }));

  const posterUrl = movie.posterPath ? `${c.env.TMDB_IMAGE_BASE}${movie.posterPath}` : null;

  const result: GuessResult = {
    correct,
    answerChoiceId: round.answerQuoteId,
    points: score.points,
    band: round.band,
    film: { title: movie.title, year: movie.year, posterUrl },
    decoySources,
  };
  return c.json(result);
});

export default app;
