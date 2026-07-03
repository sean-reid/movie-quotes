export type DifficultyBand = 'easy' | 'medium' | 'hard';

export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: number;
  title: string;
  year: number;
  decade: number;
  tmdbRating: number;
  tmdbVotes: number;
  posterPath: string | null;
  genreIds: number[];
}

export interface Quote {
  id: number;
  movieId: number;
  text: string;
  character: string | null;
}

/** A ranked decoy candidate stored on a round. */
export interface DecoyCandidate {
  quoteId: number;
  score: number;
}

/**
 * A pre-generated round. The answer is one real quote from `movieId`; decoys
 * are drawn from `decoyPool` (ranked most-similar first) so answer size can grow
 * without regenerating the pool.
 */
export interface Round {
  id: number;
  answerQuoteId: number;
  movieId: number;
  decade: number;
  primaryGenreId: number;
  band: DifficultyBand;
  avgSimilarity: number;
  /** Random key in [0, 1) for uniform, index-seekable round selection. */
  rand: number;
  decoyPool: DecoyCandidate[];
}

/** A single displayable choice, sent to the client without revealing the answer. */
export interface Choice {
  choiceId: number;
  text: string;
}

/** What the client receives to render a round. */
export interface RoundView {
  roundId: number;
  band: DifficultyBand;
  film: {
    id: number;
    title: string;
    year: number;
  };
  choices: Choice[];
}

/** What the client receives after guessing. */
export interface GuessResult {
  correct: boolean;
  answerChoiceId: number;
  points: number;
  band: DifficultyBand;
  film: {
    title: string;
    year: number;
    posterUrl: string | null;
  };
  decoySources: { title: string; year: number }[];
}
