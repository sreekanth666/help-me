import { describe, expect, it } from 'vitest';
import { STYLE_RULES } from './style-map';

const ALLOWED_PROPERTIES = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'background-color',
  'text-decoration',
  'text-align',
  'vertical-align',
  'white-space',
  'list-style-type',
  'margin-top',
  'margin-bottom',
  'border',
  'border-collapse',
  'border-left',
  'border-top',
  'padding',
  'padding-left',
  'max-width',
]);

describe('STYLE_RULES', () => {
  it('emits only properties known to survive a paste', () => {
    for (const rule of STYLE_RULES) {
      for (const property of Object.keys(rule.declarations)) {
        expect(
          ALLOWED_PROPERTIES,
          `${rule.selector} uses ${property}`,
        ).toContain(property);
      }
    }
  });

  it('never uses px or rem units', () => {
    for (const rule of STYLE_RULES) {
      for (const value of Object.values(rule.declarations)) {
        expect(value, `${rule.selector}`).not.toMatch(/\d(px|rem)\b/);
      }
    }
  });

  it('covers every construct phase 1 supports', () => {
    const selectors = STYLE_RULES.map((rule) => rule.selector);
    for (const required of [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'strong',
      'em',
      's',
      'code',
      'pre',
      'blockquote',
      'ul',
      'ol',
      'li',
      'table',
      'th',
      'td',
      'hr',
      'img',
      'sup',
    ]) {
      expect(selectors, `missing rule for ${required}`).toContain(required);
    }
  });

  it('excludes inline code styling from code inside pre', () => {
    const codeRule = STYLE_RULES.find((rule) => rule.selector === 'code');
    expect(codeRule?.excludeWithin).toBe('pre');
  });
});
