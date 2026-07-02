import { describe, expect, it } from 'vitest';
import { bandForSimilarity, nextBand } from '../src/difficulty.js';

describe('bandForSimilarity', () => {
  it('maps low similarity to easy', () => {
    expect(bandForSimilarity(0.2)).toBe('easy');
    expect(bandForSimilarity(0.49)).toBe('easy');
  });

  it('maps middling similarity to medium', () => {
    expect(bandForSimilarity(0.5)).toBe('medium');
    expect(bandForSimilarity(0.69)).toBe('medium');
  });

  it('maps high similarity to hard', () => {
    expect(bandForSimilarity(0.7)).toBe('hard');
    expect(bandForSimilarity(0.95)).toBe('hard');
  });
});

describe('nextBand', () => {
  it('steps up after a correct answer', () => {
    expect(nextBand('easy', true)).toBe('medium');
    expect(nextBand('medium', true)).toBe('hard');
  });

  it('steps down after a wrong answer', () => {
    expect(nextBand('hard', false)).toBe('medium');
    expect(nextBand('medium', false)).toBe('easy');
  });

  it('clamps at the ends', () => {
    expect(nextBand('hard', true)).toBe('hard');
    expect(nextBand('easy', false)).toBe('easy');
  });
});
