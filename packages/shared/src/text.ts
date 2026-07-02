/** Lowercase, strip punctuation, collapse whitespace. Used for dedupe comparisons. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const norm = normalize(text);
  return norm.length === 0 ? [] : norm.split(' ');
}

/** Jaccard similarity over the token sets of two strings, in [0, 1]. */
export function jaccard(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Two quotes are near-duplicates if they normalize to the same string or share
 * most of their words. Guards against showing effectively identical lines.
 */
export function isNearDuplicate(a: string, b: string, threshold = 0.8): boolean {
  if (normalize(a) === normalize(b)) return true;
  return jaccard(a, b) >= threshold;
}
