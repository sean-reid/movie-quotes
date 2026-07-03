import type { DialogueBlock } from './screenplay.js';

export const MIN_QUOTE_LEN = 30;
export const MAX_QUOTE_LEN = 180;
export const MIN_QUOTE_WORDS = 4;

// Leading speaker labels like "FUTURE:", "Man:", or "Don Corleone:" (1-3
// capitalized words then a colon).
const SPEAKER_LABEL = /^[A-Z][A-Za-z'.]*(?:\s+[A-Z][A-Za-z'.]*){0,2}:\s+/;

// First/second person pronouns and contractions are strong signals of spoken
// dialogue; third-person scene description ("He walks to the door") has none.
const DIALOGUE_SIGNAL =
  /\b(i|i'm|i'll|i've|i'd|you|you're|you'll|you've|you'd|we|we're|we'll|we've|me|my|your|us|our|mine|yours|let's)\b/i;
const CONTRACTION = /\b\w+'(t|s|re|ll|ve|d|m)\b/i;

/** True when a line reads like something a character says, not narration. */
export function isLikelyDialogue(text: string): boolean {
  return DIALOGUE_SIGNAL.test(text) || CONTRACTION.test(text) || /[?!]/.test(text);
}

/** Split a dialogue block into sentence-sized candidate lines. */
export function splitSentences(text: string): string[] {
  // Final normalization applied to every source: drop bracketed annotations and
  // repair the "l"/"I" subtitle confusion, including cases that spanned fragments.
  const cleaned = text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[[\]]/g, ' ')
    .replace(/([a-z])"([a-z])/g, "$1'$2") // mis-rendered apostrophe: it"s -> it's
    .replace(/\bl'(m|ll|ve|d|re|s)\b/g, "I'$1")
    .replace(/\bl\b/g, 'I')
    // Capital I after a lowercase letter is OCR for l (wiII -> will); two passes
    // handle consecutive I's.
    .replace(/([a-z])I/g, '$1l')
    .replace(/([a-z])I/g, '$1l')
    .replace(/\s+/g, ' ');
  return cleaned
    .split(/(?<=[.!?]["'”’]?)\s+/)
    .map((s) =>
      s
        .trim()
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .replace(SPEAKER_LABEL, '')
        .trim(),
    )
    .filter((s) => s.length > 0);
}

/**
 * A line worth guessing: sentence-length, several words, mostly letters, and not
 * shouted stage text. Deliberately conservative; some dull lines still pass and
 * get pruned during QA.
 */
export function isGoodQuote(text: string): boolean {
  if (text.length < MIN_QUOTE_LEN || text.length > MAX_QUOTE_LEN) return false;
  const words = text.split(/\s+/);
  if (words.length < MIN_QUOTE_WORDS) return false;
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (letters < text.length * 0.6) return false;
  if (text === text.toUpperCase()) return false;
  // Must start with a capital letter: drops mid-sentence fragments and lyric bleed.
  if (!/^[A-Z]/.test(text)) return false;
  if (!isLikelyDialogue(text)) return false;
  return true;
}

export interface Candidate {
  text: string;
  character: string | null;
}

/** Evenly sample at most `max` items so a long script still spans the whole film. */
function sampleEvenly<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = items.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(items[Math.floor(i * step)]!);
  return out;
}

/** Turn dialogue blocks into deduped, filtered candidate quotes for one film. */
export function extractQuotes(blocks: DialogueBlock[], maxPerMovie: number): Candidate[] {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const block of blocks) {
    for (const sentence of splitSentences(block.text)) {
      if (!isGoodQuote(sentence)) continue;
      const key = sentence
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ text: sentence, character: block.character || null });
    }
  }

  return sampleEvenly(candidates, maxPerMovie);
}
