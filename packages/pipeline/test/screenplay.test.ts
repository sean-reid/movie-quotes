import { describe, expect, it } from 'vitest';
import { isCue, parseDialogue } from '../src/util/screenplay.js';

describe('isCue', () => {
  it('accepts an all-caps character name', () => {
    expect(isCue('\t\t\tBONASERA')).toBe(true);
    expect(isCue('MICHAEL (V.O.)')).toBe(true);
  });

  it('rejects scene headings and transitions', () => {
    expect(isCue("\tINT DAY: DON'S OFFICE")).toBe(false);
    expect(isCue('FADE IN')).toBe(false);
  });

  it('rejects mixed-case action lines', () => {
    expect(isCue('He can barely speak; he is weeping now.')).toBe(false);
  });
});

describe('parseDialogue', () => {
  const script = [
    '\tINT DAY: OFFICE',
    '',
    '\t\t\tBONASERA',
    '\t\tAmerica has made my fortune.',
    '',
    '\tHe is weeping now.',
    '',
    '\t\t\tDON CORLEONE',
    '\t\tWe have known each other',
    '\t\tmany years (softly) but this',
    '\t\tis the first time you came to me.',
    '',
  ].join('\n');

  it('extracts spoken lines and attributes them to the character', () => {
    const blocks = parseDialogue(script);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ character: 'Bonasera', text: 'America has made my fortune.' });
    expect(blocks[1]!.character).toBe('Don Corleone');
  });

  it('drops parentheticals inside dialogue', () => {
    const blocks = parseDialogue(script);
    expect(blocks[1]!.text).not.toContain('softly');
    expect(blocks[1]!.text).toContain('this is the first time');
  });
});
