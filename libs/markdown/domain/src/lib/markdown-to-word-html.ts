import { convert } from './convert';

export interface WordHtml {
  /** Inline-styled HTML fragment; Word and Google Docs keep inline styles but drop classes. */
  html: string;
  /** The Markdown source, used as the clipboard's text/plain flavor. */
  text: string;
}

/**
 * Converts Markdown to an HTML fragment that pastes into Word and Google Docs
 * with Arial text, native headings, lists and tables, and highlighted code.
 */
export function markdownToWordHtml(markdown: string): WordHtml {
  // Blank input never reaches the DOM-based stages, so server rendering is safe.
  const html = markdown.trim() === '' ? '' : convert(markdown).trim();
  return { html, text: markdown };
}
