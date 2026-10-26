/**
 * A single styling rule. Rules are applied in array order and later rules win
 * on conflicting properties, so broad rules belong above narrow ones.
 */
export interface StyleRule {
  /** CSS selector, matched with querySelectorAll. */
  selector: string;
  /** Declarations written into the element's style attribute. */
  declarations: Record<string, string>;
  /** Skip any element having an ancestor that matches this selector. */
  excludeWithin?: string;
}

const BASE_FONT = 'Arial, sans-serif';
const MONO_FONT = '"Courier New", monospace';
const TEXT_COLOR = '#000000';
const MUTED_COLOR = '#5f6368';
const RULE_COLOR = '#dadce0';
const TABLE_BORDER = '1pt solid #999999';
const SHADE = '#f1f3f4';

/**
 * Selector to declarations. This is data, not logic — no imports, no DOM, no
 * loops. Edit it when a real paste into Google Docs or Word renders wrong,
 * and for no other reason.
 *
 * Values use pt because both targets are print-oriented; px and rem do not
 * round-trip predictably.
 */
export const STYLE_RULES: StyleRule[] = [
  // --- Body text -----------------------------------------------------------
  {
    selector: 'p',
    declarations: {
      'font-family': BASE_FONT,
      'font-size': '11pt',
      color: TEXT_COLOR,
      'margin-top': '0',
      'margin-bottom': '10pt',
    },
  },
  {
    selector: 'li',
    declarations: {
      'font-family': BASE_FONT,
      'font-size': '11pt',
      color: TEXT_COLOR,
    },
  },

  // --- Headings ------------------------------------------------------------
  // Google Docs maps h1-h6 onto its native Heading styles, so a pasted
  // document arrives with a working outline. These declarations supplement
  // that mapping with size and weight; they never replace it.
  {
    selector: 'h1',
    declarations: {
      'font-family': BASE_FONT,
      color: TEXT_COLOR,
      'font-size': '20pt',
      'font-weight': '700',
      'margin-top': '18pt',
      'margin-bottom': '6pt',
    },
  },
  {
    selector: 'h2',
    declarations: {
      'font-family': BASE_FONT,
      color: TEXT_COLOR,
      'font-size': '16pt',
      'font-weight': '700',
      'margin-top': '16pt',
      'margin-bottom': '4pt',
    },
  },
  {
    selector: 'h3',
    declarations: {
      'font-family': BASE_FONT,
      color: TEXT_COLOR,
      'font-size': '14pt',
      'font-weight': '700',
      'margin-top': '14pt',
      'margin-bottom': '4pt',
    },
  },
  {
    selector: 'h4',
    declarations: {
      'font-family': BASE_FONT,
      color: TEXT_COLOR,
      'font-size': '12pt',
      'font-weight': '700',
      'margin-top': '12pt',
      'margin-bottom': '4pt',
    },
  },
  {
    selector: 'h5',
    declarations: {
      'font-family': BASE_FONT,
      color: TEXT_COLOR,
      'font-size': '11pt',
      'font-weight': '700',
      'margin-top': '12pt',
      'margin-bottom': '4pt',
    },
  },
  {
    selector: 'h6',
    declarations: {
      'font-family': BASE_FONT,
      color: '#434343',
      'font-size': '11pt',
      'font-weight': '700',
      'font-style': 'italic',
      'margin-top': '12pt',
      'margin-bottom': '4pt',
    },
  },

  // --- Inline --------------------------------------------------------------
  {
    selector: 'a',
    declarations: { color: '#1155cc', 'text-decoration': 'underline' },
  },
  { selector: 'strong', declarations: { 'font-weight': '700' } },
  { selector: 'em', declarations: { 'font-style': 'italic' } },
  { selector: 's', declarations: { 'text-decoration': 'line-through' } },
  { selector: 'del', declarations: { 'text-decoration': 'line-through' } },
  {
    selector: 'sup',
    declarations: { 'vertical-align': 'super', 'font-size': '8pt' },
  },

  // --- Code ----------------------------------------------------------------
  // excludeWithin keeps this off <code> nested in <pre>, which would otherwise
  // stack a second background and a conflicting size onto the block.
  {
    selector: 'code',
    excludeWithin: 'pre',
    declarations: {
      'font-family': MONO_FONT,
      'font-size': '10pt',
      'background-color': SHADE,
      color: '#202124',
    },
  },
  // The <code> inside a <pre> inherits the block's font in a browser, but
  // inheritance is not guaranteed to survive a paste — Google Docs may treat
  // the inner element as its own run with default formatting. Stating the
  // font here costs nothing and removes the assumption. No background: the
  // <pre> already provides one.
  {
    selector: 'pre code',
    declarations: {
      'font-family': MONO_FONT,
      'font-size': '10pt',
      color: '#202124',
    },
  },
  {
    selector: 'pre',
    declarations: {
      'font-family': MONO_FONT,
      'font-size': '10pt',
      'background-color': '#f8f9fa',
      color: '#202124',
      border: `1pt solid ${RULE_COLOR}`,
      padding: '8pt',
      'white-space': 'pre-wrap',
      'margin-top': '0',
      'margin-bottom': '10pt',
    },
  },

  // --- Blocks --------------------------------------------------------------
  {
    selector: 'blockquote',
    declarations: {
      'font-family': BASE_FONT,
      'font-size': '11pt',
      color: MUTED_COLOR,
      'border-left': `3pt solid ${RULE_COLOR}`,
      'padding-left': '12pt',
      'margin-top': '0',
      'margin-bottom': '10pt',
    },
  },
  {
    selector: 'ul',
    declarations: {
      'margin-top': '0',
      'margin-bottom': '10pt',
      'padding-left': '24pt',
    },
  },
  {
    selector: 'ol',
    declarations: {
      'margin-top': '0',
      'margin-bottom': '10pt',
      'padding-left': '24pt',
    },
  },
  // Task list items carry their own ballot character, so a bullet would be
  // redundant. Google Docs may ignore this; the checklist records the result.
  {
    selector: 'li.task-list-item',
    declarations: { 'list-style-type': 'none' },
  },
  {
    selector: 'hr',
    declarations: { border: 'none', 'border-top': `1pt solid ${RULE_COLOR}` },
  },
  { selector: 'img', declarations: { 'max-width': '100%' } },

  // --- Tables --------------------------------------------------------------
  // Borders must be set per cell. Google Docs will not infer cell borders from
  // a rule on <table> alone.
  {
    selector: 'table',
    declarations: { 'border-collapse': 'collapse', 'margin-bottom': '10pt' },
  },
  {
    selector: 'th',
    declarations: {
      'font-family': BASE_FONT,
      'font-size': '11pt',
      color: TEXT_COLOR,
      border: TABLE_BORDER,
      'background-color': SHADE,
      'font-weight': '700',
      padding: '5pt',
      'text-align': 'left',
    },
  },
  {
    selector: 'td',
    declarations: {
      'font-family': BASE_FONT,
      'font-size': '11pt',
      color: TEXT_COLOR,
      border: TABLE_BORDER,
      padding: '5pt',
      'vertical-align': 'top',
    },
  },

  // --- Syntax highlighting tokens ------------------------------------------
  // highlight.js emits classes; class names are discarded on paste, so token
  // colors must be inlined like everything else.
  { selector: '.hljs-keyword', declarations: { color: '#d73a49' } },
  { selector: '.hljs-built_in', declarations: { color: '#005cc5' } },
  { selector: '.hljs-type', declarations: { color: '#005cc5' } },
  { selector: '.hljs-string', declarations: { color: '#032f62' } },
  { selector: '.hljs-number', declarations: { color: '#005cc5' } },
  { selector: '.hljs-literal', declarations: { color: '#005cc5' } },
  {
    selector: '.hljs-comment',
    declarations: { color: '#6a737d', 'font-style': 'italic' },
  },
  { selector: '.hljs-function', declarations: { color: '#6f42c1' } },
  { selector: '.hljs-title', declarations: { color: '#6f42c1' } },
  { selector: '.hljs-attr', declarations: { color: '#005cc5' } },
  { selector: '.hljs-name', declarations: { color: '#22863a' } },
  { selector: '.hljs-tag', declarations: { color: '#22863a' } },
];
