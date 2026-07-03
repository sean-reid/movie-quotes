import { describe, expect, it } from 'vitest';
import { isGoodQuote, isLikelyDialogue, splitSentences } from '../src/util/quotes.js';

describe('isLikelyDialogue', () => {
  it('accepts lines with first/second person or contractions or ?!', () => {
    expect(isLikelyDialogue('You have to trust me on this one.')).toBe(true);
    expect(isLikelyDialogue("I don't think we are in Kansas anymore.")).toBe(true);
    expect(isLikelyDialogue('What did you just say to him?')).toBe(true);
  });

  it('rejects third-person scene description', () => {
    expect(isLikelyDialogue('A nervy Scott serenades Ramona on his bass guitar.')).toBe(false);
    expect(isLikelyDialogue('The camera pans across the empty warehouse.')).toBe(false);
    expect(isLikelyDialogue('He walks slowly toward the abandoned house.')).toBe(false);
  });
});

describe('isGoodQuote', () => {
  it('keeps real dialogue', () => {
    expect(isGoodQuote('You have to ask yourself one question: do I feel lucky?')).toBe(true);
  });

  it('rejects scene descriptors that slipped in', () => {
    expect(isGoodQuote('A nervy Scott serenades Ramona on his bass guitar.')).toBe(false);
    expect(isGoodQuote('Bob was a champion bodybuilder from the valley.')).toBe(false);
  });

  it('still rejects too-short or shouted lines', () => {
    expect(isGoodQuote('You bet.')).toBe(false); // too short
    expect(isGoodQuote('GET OUT OF MY WAY RIGHT NOW YOU FOOL')).toBe(false); // all caps
  });
});

describe('splitSentences', () => {
  it('splits on sentence punctuation and strips wrapping quotes', () => {
    expect(splitSentences('"Get out." Run now!')).toEqual(['Get out.', 'Run now!']);
  });
});
