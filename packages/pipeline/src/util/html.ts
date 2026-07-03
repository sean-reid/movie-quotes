const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '-',
  '&ndash;': '-',
  '&hellip;': '...',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (match) => ENTITIES[match.toLowerCase()] ?? match);
}

/** Extract the contents of the first (largest) <pre> block, which on IMSDb holds the script. */
export function extractPre(html: string): string | null {
  const matches = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)];
  if (matches.length === 0) return null;
  const largest = matches.reduce((a, b) => (b[1]!.length > a[1]!.length ? b : a));
  return largest[1] ?? null;
}

/** Strip tags and decode entities, preserving line breaks. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
}

/** Find the first /scripts/*.html link on an IMSDb movie page. */
export function findScriptLink(html: string): string | null {
  const match = html.match(/href="(\/scripts\/[^"']+\.html)"/i);
  return match ? match[1]! : null;
}

/**
 * Extract the inner HTML of the first <div> with the given class. Handles nested
 * divs by counting open/close tags from the match.
 */
export function extractDivByClass(html: string, className: string): string | null {
  const open = new RegExp(`<div[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  const start = html.search(open);
  if (start < 0) return null;
  const openMatch = html.slice(start).match(open)!;
  const bodyStart = start + openMatch[0].length;
  let depth = 1;
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = bodyStart;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(bodyStart, m.index);
  }
  return html.slice(bodyStart);
}

/**
 * Convert a Springfield transcript block (with <br> fragments) to continuous
 * dialogue text: drop song-lyric/music lines, strip leading speaker dashes, and
 * repair subtitle artifacts like "weren 't" -> "weren't".
 */
export function transcriptToText(inner: string): string {
  return (
    inner
      .split(/<br\s*\/?>/i)
      .map((frag) =>
        decodeEntities(frag.replace(/<[^>]+>/g, ' '))
          .replace(/\[[^\]]*\]/g, ' ') // bracketed speaker/sound labels
          .replace(/[|@]+/g, ' ') // subtitle line separators and stray markers
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((frag) => frag.length > 0 && !/[#♪]/.test(frag))
      // Strip leading junk (dashes, stray punctuation) so lines start at real text.
      .map((frag) => frag.replace(/^[^\p{L}\p{N}"'¿¡]+/u, ''))
      .join(' ')
      .replace(/(\w)\s+'(t|s|re|ll|ve|d|m)\b/gi, "$1'$2")
      // Subtitle OCR confuses "l" and "I": mid-word capital I is really l
      // (wouIdn't), and a leading lowercase l is really I (l'm, standalone l).
      .replace(/([a-z])I([a-z])/g, '$1l$2')
      .replace(/\bl'(m|ll|ve|d|re|s)\b/g, "I'$1")
      .replace(/\bl\b/g, 'I')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
