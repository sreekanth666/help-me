// The plugins ship no types. Every project that compiles this file through the
// @helpme/markdown-domain alias needs the shims, so they travel with the module
// instead of relying on each consumer's tsconfig `include`.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../types/shims.d.ts" />
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';

const md = new MarkdownIt({
  // Security requirement: raw HTML is escaped, never passed through.
  // With html:true, untrusted markdown could inject script into the preview
  // and reach the clipboard without passing through the style inliner.
  html: false,
  linkify: true,
  breaks: false,
})
  .use(footnote)
  .use(taskLists, { label: false });

/** Markdown source in, semantic HTML out. No styling happens here. */
export function parse(markdown: string): string {
  return md.render(markdown);
}
