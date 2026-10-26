import { markdownToWordHtml } from './markdown-to-word-html';

const html = (md: string) => markdownToWordHtml(md).html;

describe('markdownToWordHtml', () => {
  it('returns empty html for blank input and keeps the source as plain text', () => {
    expect(markdownToWordHtml('')).toEqual({ html: '', text: '' });
    expect(markdownToWordHtml('  \n ').html).toBe('');
    expect(markdownToWordHtml('# Hi').text).toBe('# Hi');
  });

  it('maps # to h1-h6 with the Word heading look', () => {
    const out = html('# One\n\n## Two\n\n###### Six');
    expect(out).toMatch(
      /<h1 style="[^"]*Calibri Light[^"]*font-size:16pt[^"]*color:#2F5496[^"]*">One<\/h1>/,
    );
    expect(out).toMatch(/<h2 [^>]*font-size:13pt[^>]*>Two<\/h2>/);
    expect(out).toMatch(/<h6 [^>]*>Six<\/h6>/);
  });

  it('styles paragraphs in Calibri 11pt with 8pt spacing after', () => {
    expect(html('Hello')).toMatch(
      /<p style="[^"]*Calibri[^"]*font-size:11pt[^"]*margin:0 0 8pt 0">Hello<\/p>/,
    );
  });

  it('renders bold, italic and strikethrough', () => {
    const out = html('**b** *i* ~~s~~');
    expect(out).toContain('<strong>b</strong>');
    expect(out).toContain('<em>i</em>');
    expect(out).toMatch(/<del style="text-decoration:line-through">s<\/del>/);
  });

  it('renders unordered, ordered and nested lists', () => {
    const out = html('- a\n  - b\n- c\n\n3. x\n4. y');
    expect(out).toMatch(
      /<ul [^>]*><li>a<ul [^>]*><li>b<\/li>\s*<\/ul>\s*<\/li>/,
    );
    expect(out).toMatch(/<ol start="3" /);
    expect(out).toContain('<li>x</li>');
  });

  it('gives each list its own marker so nested lists under task items keep bullets', () => {
    const out = html('- [ ] a\n  - b');
    expect(out).toMatch(
      /<ul [^>]*list-style-type:disc[^>]*><li style="list-style-type:none">☐ a<ul [^>]*list-style-type:disc/,
    );
  });

  it('renders task lists with ballot-box glyphs and no bullet', () => {
    const out = html('- [x] done\n- [ ] todo');
    expect(out).toContain('<li style="list-style-type:none">☑ done</li>');
    expect(out).toContain('<li style="list-style-type:none">☐ todo</li>');
  });

  it('renders tables with borders, shaded header and column alignment', () => {
    const out = html('| A | B |\n|:-:|--:|\n| 1 | 2 |');
    expect(out).toMatch(/<table border="1" cellspacing="0" cellpadding="5"/);
    expect(out).toMatch(
      /<th align="center"[^>]*border:1px solid[^>]*text-align:center;font-weight:bold;background:#F2F2F2">A<\/th>/,
    );
    expect(out).toMatch(/<td align="right"[^>]*text-align:right">2<\/td>/);
    expect(out).toContain('<thead>');
    expect(out).toContain('<tbody>');
  });

  it('renders fenced code in Consolas, escaped, without the language label', () => {
    const out = html('```ts\nconst a = "<b>" && 1;\n```');
    expect(out).toMatch(
      /<pre style="[^"]*Consolas[^"]*white-space:pre-wrap">const a = &quot;&lt;b&gt;&quot; &amp;&amp; 1;<\/pre>/,
    );
    expect(out).not.toContain('>ts<');
  });

  it('renders inline code in Consolas', () => {
    expect(html('use `x < y`')).toMatch(
      /<code style="[^"]*Consolas[^"]*">x &lt; y<\/code>/,
    );
  });

  it('renders blockquotes with a left rule and grey text', () => {
    expect(html('> quoted')).toMatch(
      /<blockquote style="[^"]*border-left:3pt solid[^"]*color:#595959">/,
    );
  });

  it('renders horizontal rules and hard line breaks', () => {
    expect(html('---')).toMatch(/<hr style="/);
    expect(html('a  \nb')).toContain('<br>');
  });

  it('renders http links as blue underlined anchors', () => {
    expect(html('[site](https://example.com "T")')).toMatch(
      /<a href="https:\/\/example.com" title="T" style="color:#0563C1;text-decoration:underline">site<\/a>/,
    );
    expect(html('<https://example.com>')).toContain(
      'href="https://example.com"',
    );
  });

  it('drops the anchor but keeps the text for unsafe link protocols', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'vbscript:x',
      'data:text/html,x',
    ]) {
      const out = html(`[click](${bad})`);
      expect(out).not.toContain('<a ');
      expect(out).toContain('click');
    }
  });

  it('keeps http and base64 data images and drops other sources', () => {
    expect(html('![alt](https://example.com/a.png)')).toContain(
      '<img src="https://example.com/a.png" alt="alt"',
    );
    expect(html('![alt](data:image/png;base64,AAAA)')).toContain(
      '<img src="data:image/png;base64,AAAA"',
    );
    const out = html('![alt](javascript:alert(1))');
    expect(out).not.toContain('<img');
    expect(out).toContain('alt');
  });

  it('escapes raw HTML instead of emitting it', () => {
    const out = html(
      '<script>alert(1)</script>\n\nhi <img src=x onerror=alert(1)> there',
    );
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('never leaves classes or CSS variables, which Word ignores', () => {
    const out = html('# H\n\ntext\n\n| a |\n|---|\n| b |\n\n```\ncode\n```');
    expect(out).not.toMatch(/class=|var\(--/);
  });
});
