import { resolve } from 'node:path';
import { pipeline } from '@huggingface/transformers';
import { DATA_DIR, EMBED_MODEL } from '../config.js';
import type { QuoteRecord } from '../types.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

const BATCH_SIZE = 64;

export async function embed(): Promise<void> {
  log.step('embed: compute local sentence embeddings');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));

  log.info(`loading model ${EMBED_MODEL} (first run downloads and caches it)`);
  const extractor = await pipeline('feature-extraction', EMBED_MODEL);

  const embeddings: Record<number, number[]> = {};
  for (let start = 0; start < quotes.length; start += BATCH_SIZE) {
    const batch = quotes.slice(start, start + BATCH_SIZE);
    const output = await extractor(
      batch.map((q) => q.text),
      { pooling: 'mean', normalize: true },
    );
    const rows = output.tolist() as number[][];
    batch.forEach((quote, i) => {
      embeddings[quote.id] = rows[i]!;
    });
    log.info(`embedded ${Math.min(start + BATCH_SIZE, quotes.length)}/${quotes.length}`);
  }

  await writeJson(resolve(DATA_DIR, 'embeddings.json'), embeddings);
  log.info(`embed complete: ${quotes.length} vectors`);
}

embed().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
