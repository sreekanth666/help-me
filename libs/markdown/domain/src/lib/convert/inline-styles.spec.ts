import { describe, expect, it } from 'vitest';
import { inlineStyles } from './inline-styles';

describe('inlineStyles', () => {
  it('writes declarations into the style attribute', () => {
    const html = inlineStyles('<h1>Title</h1>');
    expect(html).toContain('font-size: 20pt');
    expect(html).toContain('font-weight: 700');
  });

  it('styles inline code with a background', () => {
    const html = inlineStyles('<p>use <code>npm</code></p>');
    expect(html).toContain('background-color: #f1f3f4');
  });

  it('does not apply inline-code styling to code inside pre', () => {
    const html = inlineStyles('<pre><code>const a = 1</code></pre>');
    const codeTag = html.slice(html.indexOf('<code'));
    expect(codeTag.slice(0, codeTag.indexOf('>'))).not.toContain(
      'background-color',
    );
  });

  it('sets a border on every table cell, not just the table', () => {
    const html = inlineStyles('<table><tr><th>A</th><td>1</td></tr></table>');
    expect(html).toContain('<th style="');
    expect(html).toContain('<td style="');
    expect(html.match(/border: 1pt solid #999999/g)?.length).toBe(2);
  });

  it('merges rather than duplicating a property', () => {
    const html = inlineStyles('<p style="color: #ff0000">text</p>');
    expect(html.match(/color:/g)?.length).toBe(1);
  });

  it('lets a later rule override an earlier one', () => {
    const html = inlineStyles('<p style="font-size: 99pt">text</p>');
    expect(html).toContain('font-size: 11pt');
    expect(html).not.toContain('99pt');
  });

  it('leaves unknown elements unstyled instead of throwing', () => {
    const html = inlineStyles('<section><p>inside</p></section>');
    expect(html).toContain('<section>');
    expect(html).toContain('font-size: 11pt');
  });

  it('inlines syntax highlighting token colors', () => {
    const html = inlineStyles(
      '<pre><code><span class="hljs-keyword">const</span></code></pre>',
    );
    expect(html).toContain('color: #d73a49');
  });

  it('strips class attributes once their styling is inlined', () => {
    const html = inlineStyles(
      '<pre><code><span class="hljs-keyword">const</span></code></pre>',
    );
    expect(html).not.toContain('class=');
  });

  it('gives code inside pre its own font rather than relying on inheritance', () => {
    const html = inlineStyles('<pre><code>const a = 1</code></pre>');
    const codeTag = html.slice(html.indexOf('<code'));
    const openingTag = codeTag.slice(0, codeTag.indexOf('>'));
    expect(openingTag).toContain('Courier New');
    expect(openingTag).not.toContain('background-color');
  });

  it('unwraps spans left bare by class stripping', () => {
    const html = inlineStyles('<p><span class="hljs-params">a, b</span></p>');
    expect(html).not.toContain('<span');
    expect(html).toContain('a, b');
  });

  it('keeps spans that carry a style', () => {
    const html = inlineStyles('<p><span class="hljs-keyword">const</span></p>');
    expect(html).toContain('<span style="color: #d73a49">const</span>');
  });

  it('constrains image width', () => {
    const html = inlineStyles(
      '<p><img src="https://example.com/a.png" alt="a"></p>',
    );
    expect(html).toContain('max-width: 100%');
  });
});
