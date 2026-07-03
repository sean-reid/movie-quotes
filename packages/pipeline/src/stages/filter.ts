import { resolve } from 'node:path';
import { DATA_DIR } from '../config.js';
import type { DialogueBlock } from '../util/screenplay.js';
import type { QuoteRecord } from '../types.js';
import { extractQuotes } from '../util/quotes.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

const MAX_QUOTES_PER_MOVIE = 50;

export async function filter(): Promise<void> {
  log.step('filter: select candidate quotes');
  const byMovie = await readJson<Record<string, DialogueBlock[]>>(
    resolve(DATA_DIR, 'dialogue.json'),
  );

  const quotes: QuoteRecord[] = [];
  let nextId = 1;

  for (const [movieIdStr, blocks] of Object.entries(byMovie)) {
    const movieId = Number(movieIdStr);
    const candidates = extractQuotes(blocks, MAX_QUOTES_PER_MOVIE);
    for (const candidate of candidates) {
      quotes.push({
        id: nextId++,
        movieId,
        text: candidate.text,
        character: candidate.character,
      });
    }
    log.info(`movie ${movieId}: ${candidates.length} quotes`);
  }

  await writeJson(resolve(DATA_DIR, 'quotes.json'), quotes);
  log.info(`filter complete: ${quotes.length} quotes across ${Object.keys(byMovie).length} films`);
}

filter().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
