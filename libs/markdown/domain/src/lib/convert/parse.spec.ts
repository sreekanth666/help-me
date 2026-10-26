import { describe, expect, it } from 'vitest';
import { parse } from './parse';

describe('parse', () => {
  it('converts headings to semantic heading elements', () => {
    expect(parse('# Title')).toContain('<h1>Title</h1>');
  });

  it('converts GFM tables to real table elements', () => {
    const html = parse('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('supports strikethrough', () => {
    expect(parse('~~gone~~')).toContain('<s>gone</s>');
  });

  it('emits checkbox inputs for task lists', () => {
    const html = parse('- [x] done\n- [ ] pending');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
  });

  it('emits a footnotes section', () => {
    const html = parse('Claim[^1]\n\n[^1]: Evidence');
    expect(html).toContain('footnotes');
    expect(html).toContain('Evidence');
  });

  it('tags fenced code blocks with their language', () => {
    const html = parse('```js\nconst a = 1\n```');
    expect(html).toContain('language-js');
  });

  it('escapes raw HTML rather than passing it through', () => {
    const html = parse('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('leaves math delimiters untouched in phase 1', () => {
    expect(parse('$E=mc^2$')).toContain('$E=mc^2$');
  });
});
