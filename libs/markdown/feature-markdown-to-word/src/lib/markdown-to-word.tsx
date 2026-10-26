'use client';

import { markdownToWordHtml } from '@helpme/markdown-domain';
import { ModeToggle } from '@helpme/ui/components/mode-toggle';
import { Button } from '@helpme/ui/components/ui/button';
import { Textarea } from '@helpme/ui/components/ui/textarea';
import { ClipboardPasteIcon, CopyIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { copyRichText } from './copy-html';

export function MarkdownToWord() {
  const [markdown, setMarkdown] = useState('');
  const { html, text } = useMemo(
    () => markdownToWordHtml(markdown),
    [markdown],
  );
  // Known only in the browser, so it is read after mount to keep server and client markup equal.
  const [canRead, setCanRead] = useState(false);
  useEffect(() => setCanRead(!!navigator.clipboard?.readText), []);
  const empty = html === '';

  const copy = async () => {
    try {
      await copyRichText(html, text);
      toast.success('Copied. Paste it into Word with Ctrl+V.');
    } catch {
      toast.error('Could not copy. Allow clipboard access and try again.');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      setMarkdown(await navigator.clipboard.readText());
    } catch {
      toast.error('Could not read the clipboard. Paste into the box instead.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Markdown to Word
          </h1>
          <ModeToggle />
        </div>
        <p className="text-muted-foreground">
          Paste Markdown, copy it, and paste into Word with headings, lists,
          tables and code intact. Everything stays on your device.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={copy} disabled={empty}>
          <CopyIcon data-icon="inline-start" />
          Copy for Word
        </Button>
        {canRead && (
          <Button variant="outline" onClick={pasteFromClipboard}>
            <ClipboardPasteIcon data-icon="inline-start" />
            Paste from clipboard
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => setMarkdown('')}
          disabled={markdown === ''}
        >
          <Trash2Icon data-icon="inline-start" />
          Clear
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2" aria-label="Source">
          <label htmlFor="markdown-input" className="text-sm font-medium">
            Markdown
          </label>
          <Textarea
            id="markdown-input"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="# Paste your Markdown here"
            spellCheck={false}
            className="min-h-96 font-mono text-sm"
          />
        </section>

        <section className="flex min-w-0 flex-col gap-2" aria-label="Preview">
          <h2 className="text-sm font-medium">Preview</h2>
          {/* A white page, as Word shows it, whatever the app theme. */}
          <div
            data-testid="preview"
            className="min-h-96 overflow-x-auto rounded-2xl border bg-white p-6 text-black"
          >
            {empty ? (
              <p className="text-sm text-neutral-500">
                The formatted result appears here.
              </p>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
