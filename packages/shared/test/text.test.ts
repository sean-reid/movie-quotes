import { describe, expect, it } from 'vitest';
import { normalize, jaccard, isNearDuplicate } from '../src/text.js';

describe('normalize', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalize('  Say "hello",  to  my  friend! ')).toBe('say hello to my friend');
  });
});

describe('jaccard', () => {
  it('is 1 for identical token sets', () => {
    expect(jaccard('a b c', 'c b a')).toBe(1);
  });

  it('is 0 for disjoint token sets', () => {
    expect(jaccard('cat dog', 'fish bird')).toBe(0);
  });

  it('handles partial overlap', () => {
    // tokens {a,b,c} vs {b,c,d}: intersection 2, union 4
    expect(jaccard('a b c', 'b c d')).toBe(0.5);
  });
});

describe('isNearDuplicate', () => {
  it('flags lines that differ only in punctuation or case', () => {
    expect(isNearDuplicate('I will be back.', 'i will be back')).toBe(true);
  });

  it('flags lines that share most words', () => {
    expect(isNearDuplicate('you talking to me right now', 'you talking to me right')).toBe(true);
  });

  it('does not flag genuinely different lines', () => {
    expect(isNearDuplicate('here is looking at you kid', 'i love the smell of napalm')).toBe(false);
  });
});
