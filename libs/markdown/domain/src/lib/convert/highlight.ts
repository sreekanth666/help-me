import hljs from 'highlight.js/lib/common';

const LANGUAGE_PREFIX = 'language-';

/**
 * Adds syntax highlighting spans to fenced code blocks that declare a
 * language. The spans carry hljs-* classes; inlineStyles turns those into
 * inline colors, because class names do not survive a clipboard paste.
 *
 * Blocks with no declared language are deliberately left alone — automatic
 * language detection guesses, and a wrong guess bakes misleading colors
 * permanently into the pasted document.
 */
export function highlightCode(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const block of Array.from(doc.querySelectorAll('pre > code'))) {
    const language = languageOf(block);
    if (!language || !hljs.getLanguage(language)) continue;

    // textContent returns the text markdown-it escaped, so `<script>` in the
    // source arrives here unescaped. hljs.highlight re-escapes it and emits
    // only <span> wrappers around escaped text, which is what makes assigning
    // to innerHTML safe. Do not swap in a highlighter without that guarantee.
    const source = block.textContent ?? '';
    block.innerHTML = hljs.highlight(source, {
      language,
      ignoreIllegals: true,
    }).value;
  }

  return doc.body.innerHTML;
}

function languageOf(block: Element): string | null {
  for (const className of Array.from(block.classList)) {
    if (className.startsWith(LANGUAGE_PREFIX)) {
      return className.slice(LANGUAGE_PREFIX.length);
    }
  }
  return null;
}
