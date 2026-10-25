import { SNIFF_BYTES, kindOf, readImageInfo, sniffFormat } from '@helpme/converter-domain';
import type { Capabilities } from '@helpme/converter-domain';
import { detectCapabilities } from './detect-capabilities';
import { EngineError } from './engine-error';
import type { ConvertDone, ErrorCode, FromWorker, ToWorker } from './protocol';

// The webworker lib is not in this workspace's tsconfig, so type just what is used.
const ctx = self as unknown as {
  postMessage(message: FromWorker): void;
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
};

const HEADER_BYTES = 256 * 1024;
const jobs = new Map<string, AbortController>();
let capabilities: Promise<Capabilities> | null = null;
const getCapabilities = () => (capabilities ??= detectCapabilities());

const send = (message: FromWorker) => ctx.postMessage(message);

function describe(error: unknown): { code: ErrorCode | 'canceled'; message: string } {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { code: 'canceled', message: 'Canceled' };
  }
  if (error instanceof EngineError) return { code: error.code, message: error.message };
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof RangeError || /allocation|out of memory/i.test(message)) {
    return { code: 'out-of-memory', message: 'The browser ran out of memory. Try a smaller file.' };
  }
  return { code: 'unknown', message };
}

function fail(id: string, error: unknown) {
  const { code, message } = describe(error);
  send(code === 'canceled' ? { type: 'canceled', id } : { type: 'error', id, code, message });
}

/** Progress is throttled to ~10 updates a second so messages never pile up behind a busy encoder. */
function throttled(id: string) {
  let last = 0;
  return (ratio: number) => {
    const now = performance.now();
    if (now - last < 100 && ratio < 1) return;
    last = now;
    send({ type: 'progress', id, ratio });
  };
}

async function probe(id: string, file: File) {
  const head = new Uint8Array(await file.slice(0, Math.max(SNIFF_BYTES, HEADER_BYTES)).arrayBuffer());
  const format = sniffFormat(head);
  if (!format) throw new EngineError('unsupported-input', 'Unsupported file. Use a PNG, JPEG, WebP, MP4 or WebM file.');

  if (kindOf(format) === 'image') {
    const info = readImageInfo(head);
    if (!info) throw new EngineError('unsupported-input', "Couldn't read this image's header.");
    send({ type: 'probed', id, result: { kind: 'image', format: info.format, info } });
    return;
  }
  const { probeVideo } = await import('./engines/video-engine');
  const container = format === 'mp4' ? 'mp4' : 'webm';
  send({ type: 'probed', id, result: { kind: 'video', format: container, probe: await probeVideo(file, container) } });
}

async function convert(message: Extract<ToWorker, { type: 'convert' }>) {
  const { id, file, job, sink } = message;
  const controller = new AbortController();
  jobs.set(id, controller);
  const started = performance.now();
  const onProgress = throttled(id);
  try {
    const caps = await getCapabilities();
    let result: Omit<ConvertDone, 'ms'>;
    if (job.kind === 'image') {
      const { convertImage } = await import('./engines/image-engine');
      result = await convertImage(file, job, caps, onProgress, controller.signal);
    } else {
      const { convertVideo } = await import('./engines/video-engine');
      result = await convertVideo(file, job, sink, caps, onProgress, controller.signal);
    }
    controller.signal.throwIfAborted();
    send({ type: 'done', id, ...result, ms: Math.round(performance.now() - started) });
  } catch (error) {
    fail(id, error);
  } finally {
    jobs.delete(id);
  }
}

ctx.onmessage = (event) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      void getCapabilities().then((c) => send({ type: 'ready', capabilities: c }));
      return;
    case 'probe':
      void probe(message.id, message.file).catch((e) => fail(message.id, e));
      return;
    case 'convert':
      void convert(message);
      return;
    case 'cancel':
      jobs.get(message.id)?.abort();
      return;
  }
};
