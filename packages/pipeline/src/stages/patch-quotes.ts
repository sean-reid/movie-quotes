import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Round } from '@movie-quotes/shared';
import { DATA_DIR } from '../config.js';
import type { QuoteRecord } from '../types.js';
import { cleanQuoteText } from '../util/quotes.js';
import { sqlValue } from '../util/sql.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

function deleteIn(table: string, column: string, ids: number[], chunk = 500): string[] {
  const out: string[] = [];
  for (let i = 0; i < ids.length; i += chunk) {
    out.push(`DELETE FROM ${table} WHERE ${column} IN (${ids.slice(i, i + chunk).join(',')});`);
  }
  return out;
}

/**
 * Re-clean quote text in place and prune degenerate quotes, without re-embedding
 * or regenerating rounds. Most quotes just get a stage-direction stripped (UPDATE
 * by id); a few that clean to almost nothing are deleted along with any round that
 * used them as the answer or a decoy. Quote ids and decoy references stay stable.
 */
export async function patchQuotes(): Promise<void> {
  log.step('patch-quotes: re-clean quote text in place');
  const quotes = await readJson<QuoteRecord[]>(resolve(DATA_DIR, 'quotes.json'));
  const rounds = await readJson<Round[]>(resolve(DATA_DIR, 'rounds.json'));

  const updates: string[] = [];
  const badIds = new Set<number>();
  let changed = 0;
  for (const q of quotes) {
    const cleaned = cleanQuoteText(q.text);
    if (cleaned === q.text) continue;
    if (cleaned.length < 6) {
      badIds.add(q.id);
      continue;
    }
    q.text = cleaned;
    changed += 1;
    updates.push(`UPDATE quotes SET text=${sqlValue(cleaned)} WHERE id=${q.id};`);
  }

  // Rounds that reference a deleted quote (answer or decoy) are removed.
  const keptRounds = rounds.filter(
    (r) => !badIds.has(r.answerQuoteId) && !r.decoyPool.some((d) => badIds.has(d.quoteId)),
  );
  const deletedRoundIds = rounds.filter((r) => !keptRounds.includes(r)).map((r) => r.id);
  const keptQuotes = quotes.filter((q) => !badIds.has(q.id));

  const sql = [
    ...updates,
    ...deleteIn('rounds', 'id', deletedRoundIds),
    ...deleteIn('quotes', 'id', [...badIds]),
  ].join('\n');
  await writeFile(resolve(DATA_DIR, 'patch.sql'), sql + '\n', 'utf8');
  await writeJson(resolve(DATA_DIR, 'quotes.json'), keptQuotes);
  await writeJson(resolve(DATA_DIR, 'rounds.json'), keptRounds);

  log.info(
    `patch-quotes: ${changed} cleaned, ${badIds.size} quotes deleted, ${deletedRoundIds.length} rounds removed`,
  );
}

patchQuotes().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
