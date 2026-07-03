export interface RoundResult {
  correct: boolean;
}

/** Build a Wordle-style shareable summary, optionally with a replay link. */
export function buildShareText(score: number, results: RoundResult[], url?: string): string {
  const correct = results.filter((r) => r.correct).length;
  const squares = results.map((r) => (r.correct ? '🟩' : '⬜')).join('');
  const lines = [`Movie Quotes — ${correct}/${results.length}`, squares, `${score} pts`];
  if (url) lines.push('', `Play the same rounds: ${url}`);
  return lines.join('\n');
}
