import { markdownToWordHtml } from './markdown-to-word-html';

describe('markdownToWordHtml', () => {
  it('returns empty html for blank input and keeps the source as plain text', () => {
    expect(markdownToWordHtml('')).toEqual({ html: '', text: '' });
    expect(markdownToWordHtml('  \n ').html).toBe('');
    expect(markdownToWordHtml('# Hi').text).toBe('# Hi');
  });

  it('styles everything in Arial, never Calibri', () => {
    const { html } = markdownToWordHtml(
      '# H\n\ntext\n\n| a |\n|---|\n| b |\n\n> quote\n\n- item',
    );
    expect(html).toContain('font-family: Arial, sans-serif');
    expect(html).not.toMatch(/calibri|carlito/i);
  });

  it('never leaves classes, which Word ignores', () => {
    expect(markdownToWordHtml('```js\nconst a = 1\n```').html).not.toContain(
      'class=',
    );
  });

  it('escapes raw HTML instead of emitting it', () => {
    const { html } = markdownToWordHtml(
      '<script>alert(1)</script>\n\nhi <img src=x onerror=alert(1)>',
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });
});
