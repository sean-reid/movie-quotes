import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from '@huggingface/transformers';
import { DATA_DIR, EMBED_MODEL } from '../config.js';
import type { QuoteRecord } from '../types.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

const BATCH_SIZE = 64;

/**
 * Embed every quote and write vectors as a flat Float32 binary in quotes-file
 * order (JSON would be hundreds of MB at full scale). A sidecar records the
 * dimension and count.
 */
export async function embed(): Promise<void> {
  log.step('embed: compute local sentence embeddings');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));

  log.info(`loading model ${EMBED_MODEL} (first run downloads and caches it)`);
  const extractor = await pipeline('feature-extraction', EMBED_MODEL);

  let dim = 0;
  let matrix: Float32Array | null = null;

  for (let start = 0; start < quotes.length; start += BATCH_SIZE) {
    const batch = quotes.slice(start, start + BATCH_SIZE);
    const output = await extractor(
      batch.map((q) => q.text),
      { pooling: 'mean', normalize: true },
    );
    const rows = output.tolist() as number[][];
    if (!matrix) {
      dim = rows[0]!.length;
      matrix = new Float32Array(quotes.length * dim);
    }
    rows.forEach((row, i) => matrix!.set(row, (start + i) * dim));
    log.info(`embedded ${Math.min(start + BATCH_SIZE, quotes.length)}/${quotes.length}`);
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(resolve(DATA_DIR, 'embeddings.bin'), Buffer.from(matrix!.buffer));
  await writeJson(resolve(DATA_DIR, 'embeddings.meta.json'), { dim, count: quotes.length });
  log.info(`embed complete: ${quotes.length} vectors of dim ${dim}`);
}

embed().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
