'use client';

import {
  checkOutputSize,
  formatBytes,
  formatDuration,
  formatSavings,
  limitsFor,
  targetsFor,
  type Capabilities,
  type MediaFormat,
  type QueueItem as Item,
  type VideoPlan,
} from '@helpme/converter-domain';
import { Alert, AlertDescription } from '@helpme/ui/components/ui/alert';
import { Badge } from '@helpme/ui/components/ui/badge';
import { Button } from '@helpme/ui/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@helpme/ui/components/ui/native-select';
import { Progress } from '@helpme/ui/components/ui/progress';
import { Spinner } from '@helpme/ui/components/ui/spinner';
import { Copy, Download, RotateCw, X } from 'lucide-react';
import type { ItemMeta, ItemOutput } from './use-converter';

const LABEL: Record<MediaFormat, string> = { png: 'PNG', jpeg: 'JPEG', webp: 'WebP', mp4: 'MP4', webm: 'WebM' };
const CODEC: Record<string, string> = {
  avc: 'H.264', hevc: 'HEVC', vp9: 'VP9', vp8: 'VP8', av1: 'AV1',
  aac: 'AAC', opus: 'Opus', vorbis: 'Vorbis', mp3: 'MP3', flac: 'FLAC',
};

interface QueueItemProps {
  item: Item;
  meta: ItemMeta | undefined;
  plan: VideoPlan | null;
  output: ItemOutput | undefined;
  caps: Capabilities | null;
  blocked: boolean;
  /** Why this file can't be converted on this device, shown instead of the Convert button. */
  blockReason?: string;
  onTarget: (target: MediaFormat) => void;
  onConvert: () => void;
  onSaveToFile?: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
  onDownload: () => void;
  onCopy?: () => void;
}

function describeSource(meta: ItemMeta | undefined): string | null {
  const probe = meta?.probe;
  if (!probe) return null;
  if (probe.kind === 'image') {
    const { width, height, animated } = probe.info;
    return `${LABEL[probe.format]} · ${width}×${height}${animated ? ' · animated (first frame only)' : ''}`;
  }
  const p = probe.probe;
  const codecs = [p.video?.codec, p.audio?.codec].filter(Boolean).map((c) => CODEC[c as string]).join(' + ');
  return [LABEL[probe.format], codecs, `${p.width}×${p.height}`, `${Math.round(p.fps)} fps`, formatDuration(p.durationSec)]
    .filter(Boolean)
    .join(' · ');
}

export function QueueItem(props: QueueItemProps) {
  const { item, meta, plan, output, caps, blocked } = props;
  const savings = output ? formatSavings(item.sizeBytes, output.bytes) : null;
  const sizeVerdict =
    plan?.estimatedBytes != null && caps ? checkOutputSize(plan.estimatedBytes, limitsFor(caps.deviceClass)) : 'ok';
  const idle = item.status === 'ready' || item.status === 'canceled' || item.status === 'error';

  return (
    <li data-testid="queue-item" className="flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatBytes(item.sizeBytes)}
            {describeSource(meta) ? ` · ${describeSource(meta)}` : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.name}`} onClick={props.onRemove}>
          <X />
        </Button>
      </div>

      {item.status === 'probing' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Reading file…
        </p>
      )}

      {meta?.probe && idle && item.status !== 'error' && (
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            size="sm"
            aria-label={`Convert ${item.name} to`}
            value={meta.target ?? ''}
            onChange={(e) => props.onTarget(e.target.value as MediaFormat)}
          >
            {targetsFor(meta.probe.format).map((f) => (
              <NativeSelectOption key={f} value={f}>
                {LABEL[f]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {plan && <Badge variant={plan.mode === 'copy' ? 'default' : 'secondary'}>{plan.badge}</Badge>}
          {plan?.estimatedBytes != null && (
            <span data-testid="estimate" className="text-sm text-muted-foreground">
              ≈ {formatBytes(plan.estimatedBytes)}
            </span>
          )}
        </div>
      )}

      {props.blockReason && idle && (
        <Alert variant="destructive">
          <AlertDescription>{props.blockReason}</AlertDescription>
        </Alert>
      )}
      {plan?.blockers.map((b) => (
        <Alert key={b.code} variant="destructive">
          <AlertDescription>{b.message}</AlertDescription>
        </Alert>
      ))}
      {idle && plan?.warnings.map((w) => (
        <p key={w.code + w.message} className="text-xs text-muted-foreground">
          {w.message}
        </p>
      ))}
      {idle && sizeVerdict !== 'ok' && !meta?.handle && (
        <p className="text-xs text-muted-foreground">
          {sizeVerdict === 'block'
            ? 'This output is too large to hold in memory.'
            : 'The result will be held in memory. Save to a file instead if you can.'}
        </p>
      )}

      {(item.status === 'queued' || item.status === 'running') && (
        <div className="flex items-center gap-3">
          <Progress value={item.status === 'running' ? Math.round(item.progress * 100) : 0} className="flex-1" />
          <span className="text-sm text-muted-foreground">{item.status === 'queued' ? 'Waiting…' : `${Math.round(item.progress * 100)}%`}</span>
          <Button variant="outline" size="sm" aria-label={`Cancel ${item.name}`} onClick={props.onCancel}>
            Cancel
          </Button>
        </div>
      )}

      {item.status === 'error' && item.error && (
        <Alert variant="destructive">
          <AlertDescription>{item.error}</AlertDescription>
        </Alert>
      )}

      {item.status === 'done' && output && savings && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">
            {output.name} · <span data-testid="result-size">{formatBytes(output.bytes)}</span>
          </span>
          <Badge data-testid="savings" variant={savings.direction === 'larger' ? 'destructive' : 'secondary'}>
            {savings.label}
          </Badge>
          {plan && <Badge variant="outline">{plan.badge}</Badge>}
          {output.encoder === 'wasm' && <Badge variant="outline">WebAssembly encoder</Badge>}
          {output.blob && (
            <Button size="sm" aria-label={`Download ${output.name}`} onClick={props.onDownload}>
              <Download /> Download
            </Button>
          )}
          {props.onCopy && output.blob && (
            <Button variant="outline" size="sm" aria-label={`Copy ${output.name}`} onClick={props.onCopy}>
              <Copy /> Copy
            </Button>
          )}
          {!output.blob && <Badge variant="outline">Saved to disk</Badge>}
        </div>
      )}

      {meta?.probe && (item.status === 'ready' || item.status === 'canceled') && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={blocked || sizeVerdict === 'block'} onClick={props.onConvert}>
            Convert
          </Button>
          {props.onSaveToFile && (
            <Button size="sm" variant="outline" disabled={blocked} onClick={props.onSaveToFile}>
              Save to file…
            </Button>
          )}
        </div>
      )}

      {(item.status === 'error' || item.status === 'canceled') && meta?.probe && (
        <div>
          <Button size="sm" variant="outline" aria-label={`Retry ${item.name}`} onClick={props.onRetry}>
            <RotateCw /> Retry
          </Button>
        </div>
      )}
    </li>
  );
}
