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
