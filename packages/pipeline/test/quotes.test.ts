import { describe, expect, it } from 'vitest';
import {
  cleanQuoteText,
  isGoodQuote,
  isLikelyDialogue,
  splitSentences,
} from '../src/util/quotes.js';

describe('cleanQuoteText', () => {
  it('strips leading stage directions (balanced and orphaned parens)', () => {
    expect(cleanQuoteText('(GROANING) What are you doing?')).toBe('What are you doing?');
    expect(cleanQuoteText('Fitch) You are no longer black!')).toBe('You are no longer black!');
    expect(cleanQuoteText('TV news continues ) If it fell from a plane?')).toBe(
      'If it fell from a plane?',
    );
  });

  it('strips leading speaker labels', () => {
    expect(cleanQuoteText('RONALD: Beer is all I need.')).toBe('Beer is all I need.');
  });
});

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

  it('rejects mid-sentence fragments that start lowercase', () => {
    expect(isGoodQuote('the very car that brought our relationship to an end')).toBe(false);
  });
});

describe('splitSentences', () => {
  it('splits on sentence punctuation and strips wrapping quotes', () => {
    expect(splitSentences('"Get out." Run now!')).toEqual(['Get out.', 'Run now!']);
  });
});
