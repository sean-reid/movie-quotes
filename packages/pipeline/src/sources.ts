import { politeFetchText } from './util/http.js';
import {
  extractDivByClass,
  extractPre,
  findScriptLink,
  htmlToText,
  transcriptToText,
} from './util/html.js';
import { titleKey } from './util/title.js';
import { log } from './util/log.js';
import type { MovieRecord } from './types.js';

const MIN_SCRIPT_CHARS = 3000;

export interface ScriptResult {
  text: string;
  source: string;
  kind: 'screenplay' | 'transcript';
}

export interface Source {
  name: string;
  init(): Promise<void>;
  fetch(movie: MovieRecord): Promise<ScriptResult | null>;
}

const IMSDB = 'https://imsdb.com';

/** IMSDb: full screenplays, matched via the master script index. */
export function imsdbSource(): Source {
  const index = new Map<string, string>(); // titleKey -> movie page url
  return {
    name: 'imsdb',
    async init() {
      const html = await politeFetchText(`${IMSDB}/all-scripts.html`);
      if (!html) {
        log.warn('imsdb index unavailable');
        return;
      }
      const anchor = /<a href="(\/Movie Scripts\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
      for (const m of html.matchAll(anchor)) {
        const key = titleKey(m[2]!.trim());
        if (key && !index.has(key)) index.set(key, IMSDB + encodeURI(m[1]!));
      }
      log.info(`imsdb index: ${index.size} scripts`);
    },
    async fetch(movie) {
      const key = titleKey(movie.title);
      let page = index.get(key);
      if (!page) {
        for (const [k, v] of index) {
          if (k.startsWith(key) && key.length >= 5) {
            page = v;
            break;
          }
        }
      }
      if (!page) return null;
      const moviePage = await politeFetchText(page);
      if (!moviePage) return null;
      const href = findScriptLink(moviePage);
      if (!href) return null;
      const scriptPage = await politeFetchText(IMSDB + encodeURI(href));
      if (!scriptPage) return null;
      const pre = extractPre(scriptPage);
      if (!pre) return null;
      const text = htmlToText(pre).trim();
      return text.length >= MIN_SCRIPT_CHARS ? { text, source: 'imsdb', kind: 'screenplay' } : null;
    },
  };
}

const SS = 'https://www.springfieldspringfield.co.uk';

/** Springfield! Springfield!: dialogue-only transcripts, matched via its search. */
export function springfieldSource(): Source {
  return {
    name: 'springfield',
    async init() {},
    async fetch(movie) {
      const results = await politeFetchText(
        `${SS}/movie_scripts.php?search=${encodeURIComponent(movie.title)}`,
      );
      if (!results) return null;

      const anchor = /<a href="(?:\/)?movie_script\.php\?movie=([^"']+)"[^>]*>([^<]+)<\/a>/gi;
      const want = titleKey(movie.title);
      let slug: string | null = null;
      for (const m of results.matchAll(anchor)) {
        const label = m[2]!;
        const yr = label.match(/\((\d{4})\)/);
        const year = yr ? Number(yr[1]) : null;
        const key = titleKey(label.replace(/\(\d{4}\)/, ''));
        if (key === want && (year === null || Math.abs(year - movie.year) <= 1)) {
          slug = m[1]!;
          break;
        }
      }
      if (!slug) return null;

      const page = await politeFetchText(`${SS}/movie_script.php?movie=${slug}`);
      if (!page) return null;
      const inner = extractDivByClass(page, 'scrolling-script-container');
      if (!inner) return null;
      const text = transcriptToText(inner);
      return text.length >= MIN_SCRIPT_CHARS
        ? { text, source: 'springfield', kind: 'transcript' }
        : null;
    },
  };
}
