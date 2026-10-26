const CHECKED = '☑';
const UNCHECKED = '☐';

/**
 * Repairs constructs that do not survive a clipboard paste into Google Docs
 * or Word. Runs after parse, before highlighting and style inlining.
 */
export function normalize(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  replaceCheckboxes(doc);
  unwrapFootnoteRefs(doc);
  removeBackrefs(doc);
  labelFootnotesSection(doc);

  return doc.body.innerHTML;
}

/**
 * Checkbox inputs vanish on paste; ballot characters are real text.
 *
 * No trailing space is added — markdown-it already emits one between the
 * input and the item text, and appending another yields a visible double gap.
 */
function replaceCheckboxes(doc: Document): void {
  for (const input of Array.from(
    doc.querySelectorAll('input[type="checkbox"]'),
  )) {
    const mark = input.hasAttribute('checked') ? CHECKED : UNCHECKED;
    input.replaceWith(doc.createTextNode(mark));
  }
}

/**
 * Footnote references arrive as <sup class="footnote-ref"><a href="#fn1">[1]</a></sup>.
 * The anchor points at an element id the destination document does not have,
 * so it is a dead link the moment it leaves this page. Unwrap it and keep the
 * superscript number, which is the part that carries meaning.
 */
function unwrapFootnoteRefs(doc: Document): void {
  for (const anchor of Array.from(doc.querySelectorAll('sup.footnote-ref a'))) {
    anchor.replaceWith(...Array.from(anchor.childNodes));
  }
}

/** The back-arrow is a dead link with no meaning outside the source page. */
function removeBackrefs(doc: Document): void {
  for (const anchor of Array.from(doc.querySelectorAll('a.footnote-backref'))) {
    anchor.remove();
  }
}

/**
 * markdown-it-footnote separates the section with a bare <hr>. Replace it with
 * a labelled paragraph — clearer than a rule, and unlike a heading it does not
 * appear in the document outline Google Docs builds from h1-h6.
 */
function labelFootnotesSection(doc: Document): void {
  const separator = doc.querySelector('hr.footnotes-sep');
  if (!separator) return;

  const label = doc.createElement('p');
  const strong = doc.createElement('strong');
  strong.textContent = 'Footnotes';
  label.appendChild(strong);
  separator.replaceWith(label);
}
