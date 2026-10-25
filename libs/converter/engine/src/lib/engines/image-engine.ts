import {
  checkImagePixels,
  fitWithin,
  limitsFor,
  readImageInfo,
} from '@helpme/converter-domain';
import type { Capabilities } from '@helpme/converter-domain';
import { EngineError } from '../engine-error';
import type { ConvertDone, ImageJob } from '../protocol';
import { encodeWebp } from './webp-wasm';

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;
const HEADER_BYTES = 256 * 1024;

export async function convertImage(
  file: File,
  job: ImageJob,
  caps: Capabilities,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
): Promise<Omit<ConvertDone, 'ms'>> {
  const { options } = job;

  const head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  const info = readImageInfo(head);
  if (!info) throw new EngineError('unsupported-input', "This doesn't look like a PNG, JPEG or WebP image.");

  const pixels = checkImagePixels(info.width, info.height, limitsFor(caps.deviceClass));
  if (!pixels.ok) throw new EngineError('image-too-large', pixels.message);

  const size = fitWithin(info.width, info.height, options.maxDimension);
  const resize = size.width !== info.width || size.height !== info.height;

  signal.throwIfAborted();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      file,
      resize ? { resizeWidth: size.width, resizeHeight: size.height, resizeQuality: 'high' } : undefined,
    );
  } catch {
    throw new EngineError('decode-failed', "This browser couldn't decode that image.");
  }
  onProgress(0.4);

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: options.format === 'webp' });
    if (!ctx) throw new EngineError('out-of-memory', "The browser couldn't allocate a canvas for this image.");
    if (options.format === 'jpeg') {
      // JPEG has no alpha; flatten onto the chosen colour instead of the default black.
      ctx.fillStyle = options.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    signal.throwIfAborted();
    onProgress(0.6);

    const mime = MIME[options.format];
    const encodeOptions = { type: mime, quality: options.quality / 100 };

    if (options.format === 'webp' && (options.lossless || !caps.nativeWebpEncode)) {
      return await viaWasm(ctx, canvas, options, onProgress);
    }
    const blob = await canvas.convertToBlob(encodeOptions);
    if (blob.type !== mime) {
      // The browser silently substituted another format; the wasm encoder is the honest fallback.
      if (options.format === 'webp') return await viaWasm(ctx, canvas, options, onProgress);
      throw new EngineError('encoder-unavailable', `This browser can't encode ${options.format.toUpperCase()}.`);
    }
    return { blob, bytes: blob.size, mime, encoder: 'native' };
  } finally {
    canvas.width = canvas.height = 0; // release the pixel buffer now rather than at GC
  }
}

async function viaWasm(
  ctx: OffscreenCanvasRenderingContext2D,
  canvas: OffscreenCanvas,
  options: ImageJob['options'],
  onProgress: (ratio: number) => void,
): Promise<Omit<ConvertDone, 'ms'>> {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await encodeWebp(data, { quality: options.quality, lossless: options.lossless });
  onProgress(0.95);
  const blob = new Blob([buffer], { type: MIME.webp });
  return { blob, bytes: blob.size, mime: MIME.webp, encoder: 'wasm' };
}
