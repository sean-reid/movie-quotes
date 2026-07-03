import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DATA_DIR, SCRIPTS_DIR } from '../config.js';
import type { ScriptRecord } from '../types.js';
import { parseDialogue, type DialogueBlock } from '../util/screenplay.js';
import { readJson, writeJson } from '../util/fs.js';
import { log } from '../util/log.js';

export async function parse(): Promise<void> {
  log.step('parse: extract dialogue from screenplays');
  const scripts = await readJson<ScriptRecord[]>(resolve(DATA_DIR, 'scripts.json'));

  const byMovie: Record<number, DialogueBlock[]> = {};
  for (const script of scripts) {
    const raw = await readFile(resolve(SCRIPTS_DIR, `${script.movieId}.txt`), 'utf8');
    // Transcripts are already dialogue-only; screenplays need cue/action parsing.
    const blocks =
      script.kind === 'transcript' ? [{ character: '', text: raw }] : parseDialogue(raw);
    byMovie[script.movieId] = blocks;
    log.info(`movie ${script.movieId}: ${blocks.length} dialogue blocks (${script.kind})`);
  }

  await writeJson(resolve(DATA_DIR, 'dialogue.json'), byMovie);
  log.info(`parse complete: ${scripts.length} scripts`);
}

parse().catch((error) => {
  log.warn(String(error));
  process.exit(1);
});
