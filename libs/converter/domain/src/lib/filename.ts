const ILLEGAL_CHARS = '\\/:*?"<>|';

const sanitize = (text: string) =>
  Array.from(text, (c) => (c.charCodeAt(0) < 32 || ILLEGAL_CHARS.includes(c) ? '_' : c)).join('');

/**
 * Names the converted file after its source. Illegal characters become `_`, and a name that is
 * already in `taken` (compared case-insensitively) gets ` (1)`, ` (2)`, ... The caller adds the
 * returned name to `taken`.
 */
export function buildOutputName(
  sourceName: string,
  extension: string,
  taken: ReadonlySet<string>,
): string {
  const dot = sourceName.lastIndexOf('.');
  const stem = dot === -1 ? sourceName : sourceName.slice(0, dot);
  const base = sanitize(stem).replace(/[. ]+$/, '').trim() || 'converted';

  const used = new Set(Array.from(taken, (n) => n.toLowerCase()));
  let name = `${base}.${extension}`;
  for (let n = 1; used.has(name.toLowerCase()); n++) {
    name = `${base} (${n}).${extension}`;
  }
  return name;
}
