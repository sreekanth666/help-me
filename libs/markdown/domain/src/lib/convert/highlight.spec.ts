import { describe, expect, it } from 'vitest';
import { highlightCode } from './highlight';

describe('highlightCode', () => {
  it('wraps tokens in hljs class spans', () => {
    const html = highlightCode(
      '<pre><code class="language-js">const a = 1</code></pre>',
    );
    expect(html).toContain('hljs-keyword');
  });

  it('leaves code without a declared language alone', () => {
    const html = highlightCode('<pre><code>just some text</code></pre>');
    expect(html).not.toContain('hljs-');
    expect(html).toContain('just some text');
  });

  it('ignores an unknown language rather than throwing', () => {
    const html = highlightCode(
      '<pre><code class="language-nope">xyz</code></pre>',
    );
    expect(html).toContain('xyz');
  });

  it('preserves newlines in the source', () => {
    const html = highlightCode(
      '<pre><code class="language-js">const a = 1\nconst b = 2</code></pre>',
    );
    expect(html).toContain('\n');
  });

  it('does not touch inline code', () => {
    const html = highlightCode('<p><code>const</code></p>');
    expect(html).not.toContain('hljs-');
  });

  it('re-escapes markup in the source rather than emitting live tags', () => {
    // textContent hands back the unescaped text markdown-it had escaped, so
    // this asserts the escaping guarantee that makes the innerHTML write safe.
    const html = highlightCode(
      '<pre><code class="language-js">const x = "&lt;script&gt;alert(1)&lt;/script&gt;"</code></pre>',
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
