import { STYLE_RULES, type StyleRule } from './style-map';

/**
 * Applies STYLE_RULES to every matching element as an inline style attribute.
 *
 * Inlining is mandatory rather than cosmetic: Google Docs and Word discard
 * <style> blocks and class names on paste, honouring only style attributes.
 *
 * This module owns traversal and merging. It contains no typography values —
 * those live in style-map.ts.
 */
export function inlineStyles(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const rule of STYLE_RULES) {
    for (const element of Array.from(doc.querySelectorAll(rule.selector))) {
      if (isExcluded(element, rule)) continue;
      mergeDeclarations(element, rule.declarations);
    }
  }

  stripClassAttributes(doc);
  unwrapBareSpans(doc);

  return doc.body.innerHTML;
}

function isExcluded(element: Element, rule: StyleRule): boolean {
  if (!rule.excludeWithin) return false;
  // Starts from the parent because closest() includes the element itself, and
  // a <pre> must not exclude itself from its own rule.
  return element.parentElement?.closest(rule.excludeWithin) != null;
}

/**
 * Merges declarations into any existing style attribute. Merging by property
 * name — rather than concatenating strings — guarantees each property appears
 * once, so the consuming application never has to resolve a duplicate.
 */
function mergeDeclarations(
  element: Element,
  declarations: Record<string, string>,
): void {
  const merged = parseStyleAttribute(element.getAttribute('style'));

  for (const [property, value] of Object.entries(declarations)) {
    merged.set(property, value);
  }

  const serialized = Array.from(
    merged,
    ([property, value]) => `${property}: ${value}`,
  ).join('; ');
  element.setAttribute('style', serialized);
}

function parseStyleAttribute(value: string | null): Map<string, string> {
  const declarations = new Map<string, string>();
  if (!value) return declarations;

  for (const chunk of value.split(';')) {
    const separator = chunk.indexOf(':');
    if (separator === -1) continue;

    const property = chunk.slice(0, separator).trim();
    if (property) declarations.set(property, chunk.slice(separator + 1).trim());
  }

  return declarations;
}

/**
 * Class names are discarded by Google Docs and Word on paste. Removing them
 * after inlining keeps the clipboard payload honest about what will survive:
 * a class left behind looks like styling but carries none.
 *
 * Order matters — this must run after the rules above, which match on classes
 * like .hljs-keyword.
 */
function stripClassAttributes(doc: Document): void {
  for (const element of Array.from(doc.querySelectorAll('[class]'))) {
    element.removeAttribute('class');
  }
}

/**
 * highlight.js wraps some tokens (parameter lists, for instance) in spans this
 * style map assigns no color to. Once their classes are gone those spans carry
 * nothing at all, so they are unwrapped rather than shipped as clipboard noise.
 *
 * Runs after stripClassAttributes, which is what makes them bare.
 */
function unwrapBareSpans(doc: Document): void {
  for (const span of Array.from(doc.querySelectorAll('span'))) {
    if (span.attributes.length === 0) {
      span.replaceWith(...Array.from(span.childNodes));
    }
  }
}
