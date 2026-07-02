import type { DialogueBlock } from './screenplay.js';

export const MIN_QUOTE_LEN = 25;
export const MAX_QUOTE_LEN = 180;
export const MIN_QUOTE_WORDS = 4;

/** Split a dialogue block into sentence-sized candidate lines. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) =>
      s
        .trim()
        .replace(/^["'“”]+|["'“”]+$/g, '')
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
