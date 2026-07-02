import { describe, expect, it } from 'vitest';
import { scoreGuess, timeBonus, streakMultiplier, BASE_POINTS } from '../src/scoring.js';

describe('timeBonus', () => {
  it('is maximal for an instant answer', () => {
    expect(timeBonus(0)).toBe(50);
  });

  it('decays to zero at and past the window', () => {
    expect(timeBonus(10_000)).toBe(0);
    expect(timeBonus(20_000)).toBe(0);
  });

  it('is roughly half at the midpoint', () => {
    expect(timeBonus(5_000)).toBe(25);
  });

  it('clamps negative elapsed to the maximum', () => {
    expect(timeBonus(-100)).toBe(50);
  });
});

describe('streakMultiplier', () => {
  it('starts at 1 with no streak', () => {
    expect(streakMultiplier(0)).toBe(1);
  });

  it('grows by 0.1 per prior correct answer', () => {
    expect(streakMultiplier(3)).toBeCloseTo(1.3);
  });

  it('caps at 2.0', () => {
    expect(streakMultiplier(50)).toBe(2);
  });
});

describe('scoreGuess', () => {
  it('awards nothing and resets the streak on a wrong answer', () => {
    const result = scoreGuess({ correct: false, band: 'hard', elapsedMs: 0, priorStreak: 5 });
    expect(result.points).toBe(0);
    expect(result.streak).toBe(0);
  });

  it('awards base plus time bonus with no streak', () => {
    const result = scoreGuess({ correct: true, band: 'medium', elapsedMs: 0, priorStreak: 0 });
    expect(result.points).toBe(BASE_POINTS.medium + 50);
    expect(result.streak).toBe(1);
  });

  it('applies the streak multiplier', () => {
    const result = scoreGuess({ correct: true, band: 'hard', elapsedMs: 10_000, priorStreak: 2 });
    // (100 + 0) * 1.2 = 120
    expect(result.points).toBe(120);
    expect(result.streak).toBe(3);
  });
});
