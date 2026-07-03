import type { DifficultyBand, GuessResult, RoundView } from '@movie-quotes/shared';

// Baked in at build time. Defaults to the local API worker for development.
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8787';

export interface Meta {
  genres: { id: number; name: string }[];
  decades: number[];
}

export interface RoundQuery {
  band?: DifficultyBand;
  genre?: number;
  decade?: number;
  excludeRounds?: number[];
  excludeMovies?: number[];
}

export interface GuessBody {
  choiceId: number;
  elapsedMs: number;
  priorStreak: number;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchMeta(): Promise<Meta> {
  return getJson<Meta>('/api/meta');
}

/** Returns null when no round matches (e.g. filters exhausted). */
export async function fetchRound(query: RoundQuery): Promise<RoundView | null> {
  const params = new URLSearchParams();
  if (query.band) params.set('difficulty', query.band);
  if (query.genre !== undefined) params.set('genre', String(query.genre));
  if (query.decade !== undefined) params.set('decade', String(query.decade));
  if (query.excludeRounds?.length) params.set('excludeRounds', query.excludeRounds.join(','));
  if (query.excludeMovies?.length) params.set('excludeMovies', query.excludeMovies.join(','));

  const res = await fetch(`${API_BASE}/api/round?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`round request failed: ${res.status}`);
  return res.json() as Promise<RoundView>;
}

/** Fetch a specific round by id (for replaying a shared challenge). Null if not found. */
export async function fetchRoundById(id: number): Promise<RoundView | null> {
  const res = await fetch(`${API_BASE}/api/round/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`round request failed: ${res.status}`);
  return res.json() as Promise<RoundView>;
}

export async function submitGuess(roundId: number, body: GuessBody): Promise<GuessResult> {
  const res = await fetch(`${API_BASE}/api/round/${roundId}/guess`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`guess request failed: ${res.status}`);
  return res.json() as Promise<GuessResult>;
}
