export type DeviceClass = 'desktop' | 'mobile';

export interface Limits {
  /** Largest source image, in pixels. A decoded bitmap costs width x height x 4 bytes. */
  maxPixels: number;
  /** Output size above which the user is warned (it will be held in memory). */
  warnOutputBytes: number;
  /** Output size above which the conversion is refused. */
  blockOutputBytes: number;
  /** Total of finished results kept in memory before asking the user to download and clear. */
  heldResultsBytes: number;
}

const MB = 1024 * 1024;

export function limitsFor(device: DeviceClass): Limits {
  return device === 'mobile'
    ? { maxPixels: 16e6, warnOutputBytes: 150 * MB, blockOutputBytes: 2048 * MB, heldResultsBytes: 200 * MB }
    : { maxPixels: 100e6, warnOutputBytes: 500 * MB, blockOutputBytes: 2048 * MB, heldResultsBytes: 500 * MB };
}

export function detectDeviceClass(nav: { userAgent: string; maxTouchPoints: number }): DeviceClass {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return 'mobile';
  // iPadOS reports a Mac user agent but has a touch screen.
  if (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1) return 'mobile';
  return 'desktop';
}

export type PixelCheck = { ok: true } | { ok: false; message: string };

export function checkImagePixels(width: number, height: number, limits: Limits): PixelCheck {
  const pixels = width * height;
  if (pixels <= limits.maxPixels) return { ok: true };
  const mp = (n: number) => Math.round(n / 1e6);
  return {
    ok: false,
    message: `This image is too large to convert safely on this device (${mp(pixels)} megapixels, limit ${mp(limits.maxPixels)}). Try a smaller image.`,
  };
}

export function checkOutputSize(bytes: number, limits: Limits): 'ok' | 'warn' | 'block' {
  if (bytes > limits.blockOutputBytes) return 'block';
  return bytes > limits.warnOutputBytes ? 'warn' : 'ok';
}
