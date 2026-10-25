'use client';

import { formatBytes, kindOf, limitsFor } from '@helpme/converter-domain';
import { createConverterClient, type ConverterClient } from '@helpme/converter-engine';
import { Alert, AlertDescription } from '@helpme/ui/components/ui/alert';
import { ModeToggle } from '@helpme/ui/components/mode-toggle';
import { Button } from '@helpme/ui/components/ui/button';
import { useMemo } from 'react';
import { Dropzone } from './dropzone';
import { NoticesDialog } from './notices-dialog';
import { QueueItem } from './queue-item';
import { SettingsPanel } from './settings-panel';
import { copyImageToClipboard, downloadBlob, downloadZip } from './download';
import { useConverter } from './use-converter';

declare global {
  interface Window {
    showSaveFilePicker?: (options?: { suggestedName?: string }) => Promise<FileSystemFileHandle>;
  }
}

export function MediaConverter({ client: provided }: { client?: ConverterClient }) {
  const client = useMemo(() => provided ?? createConverterClient(), [provided]);
  const c = useConverter(client);

  const items = c.queue.items;
  const limits = limitsFor(c.caps?.deviceClass ?? 'desktop');
  const eligible = items.filter((i) => i.status === 'ready' && !c.isBlocked(i.id)).length;
  const done = items.filter((i) => i.status === 'done' && c.outputs[i.id]?.blob);

  const saveToFile = async (id: string, suggestedName: string) => {
    try {
      const handle = await window.showSaveFilePicker?.({ suggestedName });
      if (handle) c.convertOne(id, handle);
    } catch {
      // the user closed the picker
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Media Converter</h1>
          <div className="flex items-center gap-1">
            <NoticesDialog />
            <ModeToggle />
          </div>
        </div>
        <p className="text-muted-foreground">
          Convert PNG, JPEG and WebP images, and MP4 and WebM videos. Everything happens in your browser, and your files
          never leave your device.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="flex min-w-0 flex-col gap-4" aria-label="Files">
          <Dropzone onFiles={c.addFiles} compact={items.length > 0} />

          {c.heldBytes > limits.heldResultsBytes && (
            <Alert>
              <AlertDescription>
                Finished files are using {formatBytes(c.heldBytes)} of memory. Download them, then press Clear to free it.
              </AlertDescription>
            </Alert>
          )}

          {items.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={eligible === 0} onClick={c.convertAll}>
                  Convert all
                </Button>
                {done.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => downloadZip(done.map((i) => ({ name: c.outputs[i.id].name, blob: c.outputs[i.id].blob as Blob })), 'converted.zip')}
                  >
                    Download all (ZIP)
                  </Button>
                )}
                <Button variant="ghost" onClick={c.clear}>
                  Clear
                </Button>
              </div>
              <ul className="flex flex-col gap-3">
                {items.map((item) => {
                  const meta = c.metas[item.id];
                  const output = c.outputs[item.id];
                  const isImage = meta?.probe ? kindOf(meta.probe.format) === 'image' : false;
                  return (
                    <QueueItem
                      key={item.id}
                      item={item}
                      blockReason={c.imageBlockReason(item.id) ?? undefined}
                      meta={meta}
                      plan={c.planFor(item.id)}
                      output={output}
                      caps={c.caps}
                      blocked={c.isBlocked(item.id)}
                      onTarget={(t) => c.setTarget(item.id, t)}
                      onConvert={() => c.convertOne(item.id)}
                      onSaveToFile={
                        c.caps?.fileSystemAccess && meta?.probe?.kind === 'video' && meta.target
                          ? () => void saveToFile(item.id, `${item.name.replace(/\.[^.]+$/, '')}.${meta.target === 'mp4' ? 'mp4' : 'webm'}`)
                          : undefined
                      }
                      onCancel={() => c.cancel(item.id)}
                      onRetry={() => c.retry(item.id)}
                      onRemove={() => c.remove(item.id)}
                      onDownload={() => output?.blob && downloadBlob(output.blob, output.name)}
                      onCopy={isImage && typeof ClipboardItem !== 'undefined' ? () => output?.blob && void copyImageToClipboard(output.blob) : undefined}
                    />
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <aside aria-label="Settings">
          <SettingsPanel settings={c.settings} onChange={c.updateSettings} />
        </aside>
      </div>
    </div>
  );
}
