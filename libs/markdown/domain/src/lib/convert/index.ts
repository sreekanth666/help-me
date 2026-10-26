import { highlightCode } from './highlight';
import { inlineStyles } from './inline-styles';
import { normalize } from './normalize';
import { parse } from './parse';

/**
 * Markdown in, paste-ready styled HTML out.
 *
 * Stage order is load-bearing:
 *   parse        - markdown to semantic HTML
 *   normalize    - repair constructs that do not survive a paste. Must precede
 *                  highlighting, which rewrites code blocks wholesale.
 *   highlight    - add hljs-* class spans inside fenced code
 *   inlineStyles - last, because it is the only stage that reads the finished
 *                  tree and it strips the classes earlier stages relied on
 */
export function convert(markdown: string): string {
  return inlineStyles(highlightCode(normalize(parse(markdown))));
}
