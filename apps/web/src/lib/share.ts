export interface RoundResult {
  correct: boolean;
}

/** Build a Wordle-style shareable summary of a finished game. */
export function buildShareText(score: number, results: RoundResult[]): string {
  const correct = results.filter((r) => r.correct).length;
  const squares = results.map((r) => (r.correct ? '🟩' : '⬜')).join('');
  return [`Movie Quotes — ${correct}/${results.length}`, squares, `${score} pts`].join('\n');
}
