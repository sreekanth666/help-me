import type { ImageFormat } from './formats';

export type ImagePreset = 'web-small' | 'balanced' | 'max';

export interface ImageOptions {
  format: ImageFormat;
  /** 1-100. Used for lossy WebP and JPEG; ignored for PNG and lossless WebP. */
  quality: number;
  /** WebP only. Forces the wasm encoder, since canvas cannot do lossless reliably. */
  lossless: boolean;
  /** Longest side in pixels, or null to keep the original size. Never upscales. */
  maxDimension: number | null;
  /** Fill colour used when flattening transparency (JPEG has no alpha). */
  background: string;
}

const DEFAULT_QUALITY = 82;
const MIN_DIMENSION = 16;
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

const PRESETS: Record<
  ImagePreset,
  { webp: number; jpeg: number; maxDimension: number | null }
> = {
  'web-small': { webp: 75, jpeg: 72, maxDimension: 1920 },
  balanced: { webp: 82, jpeg: 82, maxDimension: null },
  max: { webp: 92, jpeg: 92, maxDimension: null },
};

export function imageOptionsForPreset(
  preset: ImagePreset,
  format: ImageFormat,
): ImageOptions {
  const p = PRESETS[preset];
  return {
    format,
    quality: format === 'jpeg' ? p.jpeg : p.webp,
    lossless: false,
    maxDimension: p.maxDimension,
    background: '#ffffff',
  };
}

/** Largest size that fits `max` on its longest side, keeping the aspect ratio. Never upscales. */
export function fitWithin(
  width: number,
  height: number,
  max: number | null,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (max === null || longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Makes options safe to hand to an encoder, whatever the UI or stored settings contained. */
export function clampImageOptions(options: ImageOptions): ImageOptions {
  const quality = Number.isFinite(options.quality)
    ? Math.min(100, Math.max(1, Math.round(options.quality)))
    : DEFAULT_QUALITY;
  const maxDimension =
    options.maxDimension === null || !Number.isFinite(options.maxDimension)
      ? null
      : Math.max(MIN_DIMENSION, Math.round(options.maxDimension));
  return {
    format: options.format,
    quality,
    lossless: options.format === 'webp' && options.lossless,
    maxDimension,
    background: HEX_COLOUR.test(options.background) ? options.background : '#ffffff',
  };
}
