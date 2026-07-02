export interface DialogueBlock {
  character: string;
  text: string;
}

const CUE_ALLOWED = /^[A-Z0-9 .,'-]+$/;
const SLUG_PREFIX =
  /^(INT|EXT|FADE|CUT|DISSOLVE|SMASH|MATCH|THE END|CONTINUED|OMITTED|ANGLE|CLOSE|WIDE|POV|INSERT|BACK TO|LATER|MONTAGE|TITLE|SUPER|CREDITS|SCENE|NEW ANGLE|REVERSE)\b/;

function stripParenthetical(line: string): string {
  return line.replace(/\([^)]*\)\s*$/, '').trim();
}

/** A character cue: a short, all-caps name line, not a scene heading or transition. */
export function isCue(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 32) return false;
  const name = stripParenthetical(t);
  if (name.length === 0) return false;
  if (name.includes(':')) return false;
  if (!CUE_ALLOWED.test(name)) return false;
  if (/[a-z]/.test(name)) return false;
  if (!/[A-Z]/.test(name)) return false;
  if (SLUG_PREFIX.test(name)) return false;
  return true;
}

/**
 * Parse a screenplay into dialogue blocks. A block is a character cue followed by
 * the lines up to the next blank line or cue. Parentheticals inside dialogue are
 * dropped. Action and scene description are ignored.
 */
export function parseDialogue(raw: string): DialogueBlock[] {
  const lines = raw.split('\n');
  const blocks: DialogueBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isCue(lines[i]!)) continue;
    const character = toTitleCase(stripParenthetical(lines[i]!.trim()));
    i++;

    const spoken: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '' && !isCue(lines[i]!)) {
      spoken.push(lines[i]!.trim());
      i++;
    }

    const text = spoken
      .join(' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 0) blocks.push({ character, text });
  }

  return blocks;
}

function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}
