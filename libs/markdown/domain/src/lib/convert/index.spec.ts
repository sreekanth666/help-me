import { describe, expect, it } from 'vitest';
import { convert } from './index';
// Loaded the same way the app loads it, so the snapshot covers the exact
// string the UI ships.
import example from '../../fixtures/example.md?raw';

describe('convert', () => {
  it('produces styled HTML from markdown', () => {
    const html = convert('# Title');
    expect(html).toContain('<h1 style="');
    expect(html).toContain('font-size: 20pt');
  });

  it('runs normalize before highlighting so checkboxes survive', () => {
    const html = convert('- [x] done');
    expect(html).not.toContain('<input');
    expect(html).toContain('☑');
  });

  it('inlines token colors inside highlighted code', () => {
    const html = convert('```js\nconst a = 1\n```');
    expect(html).toContain('color: #d73a49');
  });

  it('styles table cells individually', () => {
    const html = convert('| A |\n| --- |\n| 1 |');
    expect(html).toContain('<th style="');
    expect(html).toContain('<td style="');
  });

  it('escapes raw HTML end to end', () => {
    expect(convert('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('emits no class attributes, which do not survive a paste', () => {
    // Classes are harmless but signal styling that will silently vanish.
    expect(convert(example)).not.toContain('class=');
  });

  it('matches the snapshot for the full example document', () => {
    expect(convert(example)).toMatchSnapshot();
  });
});
