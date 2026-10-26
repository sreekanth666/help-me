import { Marked, type RendererObject, type Tokens } from 'marked';

export interface WordHtml {
  /** Inline-styled HTML fragment; Word keeps inline styles but drops classes and CSS variables. */
  html: string;
  /** The Markdown source, used as the clipboard's text/plain flavor. */
  text: string;
}

// Word's default "Office" theme: Calibri 11pt body, 8pt after, 1.08 line spacing.
const BODY_FONT = 'font-family:Calibri,Carlito,Arial,sans-serif';
const HEADING_FONT =
  "font-family:'Calibri Light',Calibri,Carlito,Arial,sans-serif";
const MONO_FONT = "font-family:Consolas,'Courier New',monospace";
const BODY = `${BODY_FONT};font-size:11pt;line-height:1.08;color:#000000`;
const BORDER = '#A6A6A6';
const SHADE = '#F2F2F2';

// Word's built-in Heading 1-6 look, so pasted headings match its own styles.
const HEADINGS: Record<number, string> = {
  1: `${HEADING_FONT};font-size:16pt;color:#2F5496;margin:12pt 0 0 0`,
  2: `${HEADING_FONT};font-size:13pt;color:#2F5496;margin:2pt 0 0 0`,
  3: `${HEADING_FONT};font-size:12pt;color:#1F3763;margin:2pt 0 0 0`,
  4: `${HEADING_FONT};font-size:11pt;font-style:italic;color:#2F5496;margin:2pt 0 0 0`,
  5: `${HEADING_FONT};font-size:11pt;color:#2F5496;margin:2pt 0 0 0`,
  6: `${HEADING_FONT};font-size:11pt;color:#1F3763;margin:2pt 0 0 0`,
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Parses with the URL parser so tricks like `java\nscript:` are normalised before the check. */
function protocolOf(href: string): string | null {
  try {
    return new URL(href).protocol;
  } catch {
    return null;
  }
}

const isSafeLink = (href: string): boolean => {
  const protocol = protocolOf(href);
  return (
    protocol === 'http:' ||
    protocol === 'https:' ||
    protocol === 'mailto:' ||
    protocol === 'tel:'
  );
};

const isSafeImage = (href: string): boolean => {
  const protocol = protocolOf(href);
  if (protocol === 'http:' || protocol === 'https:') return true;
  return /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(href.trim());
};

const renderer: RendererObject = {
  // Raw HTML in the Markdown is shown as text, never emitted.
  html(token: Tokens.HTML | Tokens.Tag) {
    return 'block' in token && token.block
      ? `<p style="${BODY};margin:0 0 8pt 0">${escapeHtml(token.text.trim())}</p>\n`
      : escapeHtml(token.text);
  },

  heading({ tokens, depth }) {
    return `<h${depth} style="${HEADINGS[depth]}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  },

  paragraph({ tokens }) {
    return `<p style="${BODY};margin:0 0 8pt 0">${this.parser.parseInline(tokens)}</p>\n`;
  },

  blockquote({ tokens }) {
    return (
      `<blockquote style="${BODY};margin:0 0 8pt 0.25in;padding:0 0 0 10pt;` +
      `border-left:3pt solid ${BORDER};color:#595959">${this.parser.parse(tokens)}</blockquote>\n`
    );
  },

  hr() {
    return `<hr style="border:0;border-top:1pt solid ${BORDER};margin:12pt 0" />\n`;
  },

  code({ text }) {
    const body = escapeHtml(text.replace(/\n$/, ''));
    return (
      `<pre style="${MONO_FONT};font-size:10pt;line-height:1.2;color:#000000;background:${SHADE};` +
      `border:1px solid ${BORDER};padding:6pt;margin:0 0 8pt 0;white-space:pre-wrap">${body}</pre>\n`
    );
  },

  codespan({ text }) {
    return `<code style="${MONO_FONT};font-size:10pt;background:${SHADE}">${escapeHtml(text)}</code>`;
  },

  list({ ordered, start, items }) {
    const tag = ordered ? 'ol' : 'ul';
    const startAttr =
      ordered && start !== '' && start !== 1 ? ` start="${start}"` : '';
    const body = items.map((item) => this.listitem(item)).join('');
    // An explicit marker per list, so a nested list under a task item doesn't inherit `none`.
    const marker = ordered ? 'decimal' : 'disc';
    return `<${tag}${startAttr} style="${BODY};margin:0 0 8pt 0.5in;padding:0;list-style-type:${marker}">${body}</${tag}>\n`;
  },

  listitem(item) {
    const style = item.task ? ' style="list-style-type:none"' : '';
    return `<li${style}>${this.parser.parse(item.tokens)}</li>\n`;
  },

  checkbox({ checked }) {
    return checked ? '☑ ' : '☐ ';
  },

  table({ header, rows }) {
    const cell = (c: Tokens.TableCell): string => {
      const tag = c.header ? 'th' : 'td';
      const align = c.align ? `;text-align:${c.align}` : '';
      const head = c.header ? `;font-weight:bold;background:${SHADE}` : '';
      const alignAttr = c.align ? ` align="${c.align}"` : '';
      return (
        `<${tag}${alignAttr} valign="top" style="${BODY};border:1px solid ${BORDER};` +
        `padding:3pt 5.4pt;vertical-align:top${align}${head}">${this.parser.parseInline(c.tokens)}</${tag}>`
      );
    };
    const row = (cells: Tokens.TableCell[]): string =>
      `<tr>${cells.map(cell).join('')}</tr>\n`;
    return (
      `<table border="1" cellspacing="0" cellpadding="5" ` +
      `style="border-collapse:collapse;border:1px solid ${BORDER};margin:0 0 8pt 0">\n` +
      `<thead>${row(header)}</thead>\n<tbody>${rows.map(row).join('')}</tbody></table>\n`
    );
  },

  del({ tokens }) {
    return `<del style="text-decoration:line-through">${this.parser.parseInline(tokens)}</del>`;
  },

  link({ href, title, tokens }) {
    const inner = this.parser.parseInline(tokens);
    if (!isSafeLink(href)) return inner;
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<a href="${escapeHtml(href)}"${titleAttr} style="color:#0563C1;text-decoration:underline">${inner}</a>`;
  },

  image({ href, title, text }) {
    if (!isSafeImage(href)) return escapeHtml(text);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titleAttr} style="max-width:100%" />`;
  },
};

const marked = new Marked({ gfm: true, async: false, renderer });

/**
 * Converts Markdown to an HTML fragment that pastes into Microsoft Word with
 * its own look: real Heading 1-6 styles, native lists and tables, Consolas code.
 */
export function markdownToWordHtml(markdown: string): WordHtml {
  const html =
    markdown.trim() === '' ? '' : (marked.parse(markdown) as string).trim();
  return { html, text: markdown };
}
