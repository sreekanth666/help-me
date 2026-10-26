import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';
import { parse } from './parse';

describe('normalize', () => {
  it('replaces an unchecked box with the ballot character', () => {
    const html = normalize(parse('- [ ] pending'));
    expect(html).not.toContain('<input');
    expect(html).toContain('☐');
  });

  it('replaces a checked box with the checked ballot character', () => {
    const html = normalize(parse('- [x] done'));
    expect(html).not.toContain('<input');
    expect(html).toContain('☑');
  });

  it('unwraps the footnote reference link but keeps the number', () => {
    const html = normalize(parse('Claim[^1]\n\n[^1]: Evidence'));
    // The anchor targets an element id the destination document will not have.
    expect(html).not.toContain('href="#fn1"');
    expect(html).toContain('<sup');
    expect(html).toContain('[1]');
  });

  it('removes footnote back-reference links', () => {
    const html = normalize(parse('Claim[^1]\n\n[^1]: Evidence'));
    expect(html).not.toContain('footnote-backref');
    expect(html).not.toContain('↩');
  });

  it('labels the footnotes section', () => {
    const html = normalize(parse('Claim[^1]\n\n[^1]: Evidence'));
    expect(html).toContain('Footnotes');
    expect(html).not.toContain('footnotes-sep');
  });

  it('keeps the footnote body text', () => {
    const html = normalize(parse('Claim[^1]\n\n[^1]: Evidence'));
    expect(html).toContain('Evidence');
  });

  it('leaves exactly one space between the mark and the item text', () => {
    // markdown-it already emits a space after the input element; adding
    // another produces a visible double gap in the pasted document.
    const html = normalize(parse('- [ ] pending'));
    expect(html).toContain('☐ pending');
    expect(html).not.toContain('☐  pending');
  });

  it('leaves ordinary content untouched', () => {
    const html = normalize(parse('# Title\n\nPlain paragraph.'));
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('Plain paragraph.');
  });
});
