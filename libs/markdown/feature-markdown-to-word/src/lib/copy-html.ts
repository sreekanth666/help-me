/**
 * Puts rich text on the clipboard. Word reads the `text/html` flavor; `text`
 * is the fallback for plain-text targets.
 */
export async function copyRichText(html: string, text: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return;
  }
  copyViaSelection(html);
}

/** Older browsers and non-secure contexts: select a rendered copy and run the legacy copy command. */
function copyViaSelection(html: string): void {
  const holder = document.createElement('div');
  holder.contentEditable = 'true';
  holder.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  holder.innerHTML = html;
  document.body.appendChild(holder);
  const selection = window.getSelection();
  try {
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection?.removeAllRanges();
    selection?.addRange(range);
    if (!document.execCommand('copy'))
      throw new Error('Copy command was rejected');
  } finally {
    selection?.removeAllRanges();
    holder.remove();
  }
}
