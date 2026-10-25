import type {
  Capabilities,
  ImageFormat,
  ImageInfo,
  ImageOptions,
  VideoFormat,
  VideoPlan,
  VideoProbe,
} from '@helpme/converter-domain';

export type ProbeResult =
  | { kind: 'image'; format: ImageFormat; info: ImageInfo }
  | { kind: 'video'; format: VideoFormat; probe: VideoProbe };

export type ErrorCode =
  | 'unsupported-input'
  | 'decode-failed'
  | 'encoder-unavailable'
  | 'image-too-large'
  | 'out-of-memory'
  | 'write-failed'
  | 'unknown';

export interface ImageJob {
  kind: 'image';
  options: ImageOptions;
}

export interface VideoJob {
  kind: 'video';
  plan: VideoPlan;
  probe: VideoProbe;
}

export type ConvertJob = ImageJob | VideoJob;

/** Where the output goes: memory, or straight to a file the user picked (Chromium). */
export type SinkSpec = { kind: 'blob' } | { kind: 'fs'; handle: FileSystemFileHandle };

export type ToWorker =
  | { type: 'init' }
  | { type: 'probe'; id: string; file: File }
  | { type: 'convert'; id: string; file: File; job: ConvertJob; sink: SinkSpec }
  | { type: 'cancel'; id: string };

export interface ConvertDone {
  /** null when the output was streamed to disk. */
  blob: Blob | null;
  bytes: number;
  mime: string;
  ms: number;
  /** Which encoder produced an image: the browser's own, or the wasm fallback. */
  encoder: 'native' | 'wasm';
}

export type FromWorker =
  | { type: 'ready'; capabilities: Capabilities }
  | { type: 'probed'; id: string; result: ProbeResult }
  | { type: 'progress'; id: string; ratio: number }
  | ({ type: 'done'; id: string } & ConvertDone)
  | { type: 'error'; id: string; code: ErrorCode; message: string }
  | { type: 'canceled'; id: string };
