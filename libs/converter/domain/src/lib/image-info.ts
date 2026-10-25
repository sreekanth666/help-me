import type { ImageFormat } from './formats';

export interface ImageInfo {
  format: ImageFormat;
  width: number;
  height: number;
  /** APNG or animated WebP. Conversion keeps only the first frame. */
  animated: boolean;
}

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32be = (b: Uint8Array, o: number) =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const tag = (b: Uint8Array, o: number, text: string) =>
  b.length >= o + text.length && [...text].every((c, i) => b[o + i] === c.charCodeAt(0));

/**
 * Reads size and animation from the first bytes of a PNG, JPEG or WebP, without decoding it.
 * 256 KB is plenty even when a JPEG carries a large EXIF block. Returns null if the header is
 * unrecognised or cut short.
 */
export function readImageInfo(head: Uint8Array): ImageInfo | null {
  return readPng(head) ?? readJpeg(head) ?? readWebp(head);
}

function readPng(b: Uint8Array): ImageInfo | null {
  if (!tag(b, 12, 'IHDR') || b[0] !== 0x89 || !tag(b, 1, 'PNG') || b.length < 24) return null;
  let animated = false;
  for (let pos = 8; pos + 8 <= b.length; ) {
    if (tag(b, pos + 4, 'acTL')) animated = true;
    if (tag(b, pos + 4, 'IDAT')) break;
    pos += 12 + u32be(b, pos);
  }
  return { format: 'png', width: u32be(b, 16), height: u32be(b, 20), animated };
}

function readJpeg(b: Uint8Array): ImageInfo | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 4 <= b.length) {
    if (b[pos] !== 0xff) return null;
    const marker = b[pos + 1];
    if (marker === 0xff) { pos++; continue; } // fill byte
    if (marker === 0xd9 || marker === 0xda) return null; // end / scan: no frame header seen
    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      if (pos + 9 > b.length) return null;
      return { format: 'jpeg', width: u16be(b, pos + 7), height: u16be(b, pos + 5), animated: false };
    }
    pos += 2 + u16be(b, pos + 2);
  }
  return null;
}

function readWebp(b: Uint8Array): ImageInfo | null {
  if (!tag(b, 0, 'RIFF') || !tag(b, 8, 'WEBP')) return null;
  if (tag(b, 12, 'VP8X') && b.length >= 30) {
    return {
      format: 'webp',
      width: u24le(b, 24) + 1,
      height: u24le(b, 27) + 1,
      animated: (b[20] & 0x02) !== 0,
    };
  }
  if (tag(b, 12, 'VP8L') && b.length >= 25 && b[20] === 0x2f) {
    const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, animated: false };
  }
  if (tag(b, 12, 'VP8 ') && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
    return { format: 'webp', width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff, animated: false };
  }
  return null;
}
