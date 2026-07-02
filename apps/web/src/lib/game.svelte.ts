import {
  nextBand,
  type DifficultyBand,
  type GuessResult,
  type RoundView,
} from '@movie-quotes/shared';
import { fetchRound, submitGuess } from './api';
import { recordGame } from './stats';

export const TOTAL_ROUNDS = 10;

export type Phase = 'idle' | 'loading' | 'question' | 'reveal' | 'done' | 'error';

export interface GameConfig {
  genre?: number;
  decade?: number;
}

export interface RoundOutcome {
  correct: boolean;
}

export class Game {
  phase = $state<Phase>('idle');
  roundNumber = $state(0); // 1-based, for display
  score = $state(0);
  streak = $state(0);
  bestStreak = $state(0);
  view = $state<RoundView | null>(null);
  guess = $state<GuessResult | null>(null);
  selectedChoiceId = $state<number | null>(null);
  results = $state<RoundOutcome[]>([]);
  error = $state<string | null>(null);

  private config: GameConfig;
  private band: DifficultyBand = 'easy';
  private seenRounds: number[] = [];
  private seenMovies: number[] = [];
  private askedAt = 0;

  constructor(config: GameConfig = {}) {
    this.config = config;
  }

  async start(): Promise<void> {
    this.phase = 'loading';
    this.roundNumber = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.results = [];
    this.error = null;
    this.band = 'easy';
    this.seenRounds = [];
    this.seenMovies = [];
    await this.loadNext();
  }

  private async loadNext(): Promise<void> {
    this.phase = 'loading';
    this.guess = null;
    this.selectedChoiceId = null;
    try {
      const round = await this.fetchWithRelaxation();
      if (!round) {
        // Nothing left to serve; end the game with what we have.
        this.finish();
        return;
      }
      this.view = round;
      this.seenRounds.push(round.roundId);
      this.seenMovies.push(round.film.id);
      this.roundNumber += 1;
      this.askedAt = performance.now();
      this.phase = 'question';
    } catch {
      this.error = 'Could not load the next round. Check your connection and try again.';
      this.phase = 'error';
    }
  }

  /** Try progressively looser queries so a small or filtered corpus never dead-ends. */
  private async fetchWithRelaxation(): Promise<RoundView | null> {
    const base = {
      genre: this.config.genre,
      decade: this.config.decade,
      excludeRounds: this.seenRounds,
    };
    return (
      (await fetchRound({ ...base, band: this.band, excludeMovies: this.seenMovies })) ??
      (await fetchRound({ ...base, band: this.band })) ??
      (await fetchRound(base))
    );
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
    } catch {
      this.error = 'Could not score that guess. Check your connection and try again.';
      this.phase = 'error';
    }
  }

  async next(): Promise<void> {
    if (this.phase !== 'reveal') return;
    const lastCorrect = this.guess?.correct ?? false;
    this.band = nextBand(this.band, lastCorrect);
    if (this.roundNumber >= TOTAL_ROUNDS) {
      this.finish();
    } else {
      await this.loadNext();
    }
  }

  private finish(): void {
    this.phase = 'done';
    const correct = this.results.filter((r) => r.correct).length;
    recordGame({
      score: this.score,
      correct,
      rounds: this.results.length,
      bestStreak: this.bestStreak,
    });
  }

  get correctCount(): number {
    return this.results.filter((r) => r.correct).length;
  }
}
