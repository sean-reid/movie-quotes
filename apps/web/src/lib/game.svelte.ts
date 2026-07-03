import {
  nextBand,
  type DifficultyBand,
  type GuessResult,
  type RoundView,
} from '@movie-quotes/shared';
import { fetchRound, fetchRoundById, submitGuess } from './api';
import { recordGame } from './stats';

export const TOTAL_ROUNDS = 10;

export type Phase = 'idle' | 'loading' | 'question' | 'reveal' | 'done' | 'error';

export interface GameConfig {
  /** When set, replay this exact sequence of rounds (a shared challenge). */
  roundIds?: number[];
}

export interface RoundOutcome {
  correct: boolean;
}

export class Game {
  phase = $state<Phase>('idle');
  roundNumber = $state(0); // rounds served so far (1-based once playing)
  score = $state(0);
  streak = $state(0);
  bestStreak = $state(0);
  view = $state<RoundView | null>(null);
  guess = $state<GuessResult | null>(null);
  selectedChoiceId = $state<number | null>(null);
  results = $state<RoundOutcome[]>([]);
  error = $state<string | null>(null);
  /** Round ids served this game, in order, for building a shareable challenge link. */
  playedRoundIds = $state<number[]>([]);

  private readonly challengeIds: number[] | null;
  private band: DifficultyBand = 'easy';
  private seenRounds: number[] = [];
  private seenMovies: number[] = [];
  private askedAt = 0;
  private prefetch: Promise<RoundView | null> | null = null;

  constructor(config: GameConfig = {}) {
    const ids = config.roundIds?.slice(0, TOTAL_ROUNDS);
    this.challengeIds = ids && ids.length > 0 ? ids : null;
  }

  get total(): number {
    return this.challengeIds ? this.challengeIds.length : TOTAL_ROUNDS;
  }

  get correctCount(): number {
    return this.results.filter((r) => r.correct).length;
  }

  async start(): Promise<void> {
    this.phase = 'loading';
    this.roundNumber = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.results = [];
    this.playedRoundIds = [];
    this.error = null;
    this.band = 'easy';
    this.seenRounds = [];
    this.seenMovies = [];
    this.prefetch = null;
    await this.loadNext();
  }

  /** Fetch the next round based on mode; does not mutate game state. */
  private fetchNext(): Promise<RoundView | null> {
    if (this.challengeIds) {
      const id = this.challengeIds[this.roundNumber];
      return id === undefined ? Promise.resolve(null) : fetchRoundById(id);
    }
    return fetchRound({
      band: this.band,
      excludeRounds: this.seenRounds,
      excludeMovies: this.seenMovies,
    }).then(
      (r) =>
        r ??
        fetchRound({ band: this.band, excludeRounds: this.seenRounds }).then(
          (r2) => r2 ?? fetchRound({ excludeRounds: this.seenRounds }),
        ),
    );
  }

  private async loadNext(): Promise<void> {
    this.phase = 'loading';
    this.guess = null;
    this.selectedChoiceId = null;
    try {
      let round: RoundView | null;
      if (this.prefetch) {
        try {
          round = await this.prefetch;
        } catch {
          round = await this.fetchNext();
        }
        this.prefetch = null;
      } else {
        round = await this.fetchNext();
      }
      if (!round) {
        this.finish();
        return;
      }
      this.serveRound(round);
    } catch {
      this.error = 'Could not load the next round. Check your connection and try again.';
      this.phase = 'error';
    }
  }

  private serveRound(round: RoundView): void {
    this.view = round;
    this.playedRoundIds = [...this.playedRoundIds, round.roundId];
    this.seenRounds.push(round.roundId);
    this.seenMovies.push(round.film.id);
    this.roundNumber += 1;
    this.guess = null;
    this.selectedChoiceId = null;
    this.askedAt = performance.now();
    this.phase = 'question';
  }

  async choose(choiceId: number): Promise<void> {
    if (this.phase !== 'question' || !this.view) return;
    this.selectedChoiceId = choiceId;
    this.phase = 'reveal';
    const elapsedMs = Math.round(performance.now() - this.askedAt);
    try {
      const result = await submitGuess(this.view.roundId, {
        choiceId,
        elapsedMs,
        priorStreak: this.streak,
      });
      this.guess = result;
      this.score += result.points;
      this.streak = result.correct ? this.streak + 1 : 0;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.results = [...this.results, { correct: result.correct }];
      // Advance difficulty and prefetch the next round while the player reads
      // the reveal, so advancing is instant.
      this.band = nextBand(this.band, result.correct);
      this.prefetch = this.roundNumber < this.total ? this.fetchNext() : null;
    } catch {
      this.error = 'Could not score that guess. Check your connection and try again.';
      this.phase = 'error';
    }
  }

  async next(): Promise<void> {
    if (this.phase !== 'reveal') return;
    if (this.roundNumber >= this.total) {
      this.finish();
    } else {
      await this.loadNext();
    }
  }

  private finish(): void {
    this.phase = 'done';
    recordGame({
      score: this.score,
      correct: this.correctCount,
      rounds: this.results.length,
      bestStreak: this.bestStreak,
    });
  }
}
