import type { Capabilities } from '@helpme/converter-domain';
import type {
  ConvertDone,
  ConvertJob,
  ErrorCode,
  FromWorker,
  ProbeResult,
  SinkSpec,
  ToWorker,
} from './protocol';

export class ConverterError extends Error {
  constructor(
    readonly code: ErrorCode | 'canceled',
    message: string,
  ) {
    super(message);
    this.name = 'ConverterError';
  }
}

/** The slice of `Worker` the client uses, so tests can supply a fake. */
export interface WorkerLike {
  postMessage(message: ToWorker): void;
  terminate(): void;
  onmessage: ((event: { data: FromWorker }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
}

export interface ClientOptions {
  createWorker?: () => WorkerLike;
  /** How long a canceled job gets to stop by itself before the worker is terminated. */
  cancelGraceMs?: number;
}

export interface ConvertRequest {
  file: File;
  job: ConvertJob;
  sink: SinkSpec;
}

export interface ConvertHandlers {
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export interface ConverterClient {
  capabilities(): Promise<Capabilities>;
  probe(file: File): Promise<ProbeResult>;
  convert(request: ConvertRequest, handlers?: ConvertHandlers): Promise<ConvertDone>;
  dispose(): void;
}

interface Pending {
  resolve(value: never): void;
  reject(error: Error): void;
  onProgress?: (ratio: number) => void;
}

const defaultWorker = (): WorkerLike =>
  new Worker(new URL('./converter.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike;

/**
 * The only main-thread entry to the engine. The worker is created on first use, replies are
 * matched to requests by id, and a worker that ignores a cancel is terminated and replaced.
 */
export function createConverterClient(options: ClientOptions = {}): ConverterClient {
  const createWorker = options.createWorker ?? defaultWorker;
  const cancelGraceMs = options.cancelGraceMs ?? 1500;

  let worker: WorkerLike | null = null;
  let counter = 0;
  const pending = new Map<string, Pending>();
  let capabilitiesPromise: Promise<Capabilities> | null = null;
  let resolveCapabilities: ((c: Capabilities) => void) | null = null;

  const failAll = (error: Error) => {
    const all = [...pending.values()];
    pending.clear();
    all.forEach((p) => p.reject(error));
  };

  const killWorker = (error: Error) => {
    worker?.terminate();
    worker = null;
    failAll(error);
  };

  const ensureWorker = (): WorkerLike => {
    if (worker) return worker;
    const w = createWorker();
    w.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        resolveCapabilities?.(data.capabilities);
        return;
      }
      const entry = pending.get(data.id);
      if (!entry) return;
      switch (data.type) {
        case 'progress':
          entry.onProgress?.(data.ratio);
          return;
        case 'probed':
          pending.delete(data.id);
          entry.resolve(data.result as never);
          return;
        case 'done': {
          pending.delete(data.id);
          const result: ConvertDone = {
            blob: data.blob,
            bytes: data.bytes,
            mime: data.mime,
            ms: data.ms,
            encoder: data.encoder,
          };
          entry.resolve(result as never);
          return;
        }
        case 'error':
          pending.delete(data.id);
          entry.reject(new ConverterError(data.code, data.message));
          return;
        case 'canceled':
          pending.delete(data.id);
          entry.reject(new ConverterError('canceled', 'Canceled'));
          return;
      }
    };
    w.onerror = (event) =>
      killWorker(new ConverterError('unknown', event.message ?? 'The conversion worker crashed'));
    worker = w;
    return w;
  };

  const request = <T>(
    build: (id: string) => ToWorker,
    handlers: ConvertHandlers = {},
  ): Promise<T> => {
    const { signal, onProgress } = handlers;
    if (signal?.aborted) return Promise.reject(new ConverterError('canceled', 'Canceled'));

    const id = String(++counter);
    const w = ensureWorker();
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve, reject, onProgress } as Pending);
      signal?.addEventListener(
        'abort',
        () => {
          if (!pending.has(id)) return;
          w.postMessage({ type: 'cancel', id });
          setTimeout(() => {
            if (pending.has(id) && worker === w) {
              killWorker(new ConverterError('canceled', 'Canceled'));
            }
          }, cancelGraceMs);
        },
        { once: true },
      );
      w.postMessage(build(id));
    });
  };

  return {
    capabilities() {
      capabilitiesPromise ??= new Promise<Capabilities>((resolve) => {
        resolveCapabilities = resolve;
        ensureWorker().postMessage({ type: 'init' });
      }).then((caps) => ({
        ...caps,
        // Only the main thread can see the file picker.
        fileSystemAccess: typeof window !== 'undefined' && 'showSaveFilePicker' in window,
      }));
      return capabilitiesPromise;
    },
    probe: (file) => request<ProbeResult>((id) => ({ type: 'probe', id, file })),
    convert: ({ file, job, sink }, handlers) =>
      request<ConvertDone>((id) => ({ type: 'convert', id, file, job, sink }), handlers),
    dispose() {
      killWorker(new ConverterError('canceled', 'Disposed'));
      capabilitiesPromise = null;
    },
  };
}
