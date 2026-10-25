import { readImageInfo } from './image-info';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const u32be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16be = (n: number) => [(n >>> 8) & 255, n & 255];
const bytes = (...parts: (number | number[])[]) => Uint8Array.from(parts.flat());

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const pngChunk = (type: string, data: number[]) => [
  ...u32be(data.length),
  ...ascii(type),
  ...data,
  0, 0, 0, 0,
];
const ihdr = (w: number, h: number) =>
  pngChunk('IHDR', [...u32be(w), ...u32be(h), 8, 6, 0, 0, 0]);

describe('readImageInfo: PNG', () => {
  it('reads width and height from IHDR', () => {
    const png = bytes(PNG_SIG, ihdr(800, 600), pngChunk('IDAT', [0]));
    expect(readImageInfo(png)).toEqual({ format: 'png', width: 800, height: 600, animated: false });
  });

  it('flags APNG by its acTL chunk', () => {
    const png = bytes(PNG_SIG, ihdr(10, 10), pngChunk('acTL', [0, 0, 0, 2, 0, 0, 0, 0]), pngChunk('IDAT', [0]));
    expect(readImageInfo(png)?.animated).toBe(true);
  });
});

describe('readImageInfo: JPEG', () => {
  const sof = (w: number, h: number) => [0xff, 0xc0, ...u16be(17), 8, ...u16be(h), ...u16be(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];

  it('reads size from the SOF marker', () => {
    expect(readImageInfo(bytes([0xff, 0xd8], sof(4000, 3000)))).toEqual({
      format: 'jpeg', width: 4000, height: 3000, animated: false,
    });
  });

  it('skips an EXIF segment before the SOF marker', () => {
    const exif = [0xff, 0xe1, ...u16be(10), ...ascii('Exif'), 0, 0, 0, 0];
    expect(readImageInfo(bytes([0xff, 0xd8], exif, sof(640, 480)))).toMatchObject({
      width: 640, height: 480,
    });
  });

  it('returns null if the header ends before any SOF marker', () => {
    expect(readImageInfo(bytes([0xff, 0xd8, 0xff, 0xe1, ...u16be(500)]))).toBeNull();
  });
});

describe('readImageInfo: WebP', () => {
  const riff = (...chunk: number[][]) => bytes(ascii('RIFF'), 0, 0, 0, 0, ascii('WEBP'), ...chunk);

  it('reads a lossy VP8 frame header', () => {
    // 'VP8 ', size, frame tag (3), start code 9d 01 2a, width (14 bits LE), height
    const vp8 = [...ascii('VP8 '), 0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, ...[0x20, 0x03], ...[0x58, 0x02]];
    expect(readImageInfo(riff(vp8))).toEqual({ format: 'webp', width: 800, height: 600, animated: false });
  });

  it('reads a lossless VP8L header', () => {
    // width-1 = 799 (14 bits), height-1 = 599 (14 bits), packed LE after 0x2f
    const w = 799, h = 599;
    const packed = (w & 0x3fff) | ((h & 0x3fff) << 14);
    const vp8l = [...ascii('VP8L'), 0, 0, 0, 0, 0x2f, packed & 255, (packed >>> 8) & 255, (packed >>> 16) & 255, (packed >>> 24) & 255];
    expect(readImageInfo(riff(vp8l))).toMatchObject({ width: 800, height: 600, animated: false });
  });

  it('reads the canvas size and animation flag from VP8X', () => {
    const le24 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255];
    const vp8x = [...ascii('VP8X'), 10, 0, 0, 0, 0x02, 0, 0, 0, ...le24(1919), ...le24(1079)];
    expect(readImageInfo(riff(vp8x))).toEqual({ format: 'webp', width: 1920, height: 1080, animated: true });
  });
});

describe('readImageInfo: other input', () => {
  it('returns null for non-images and truncated data', () => {
    expect(readImageInfo(bytes(1, 2, 3, 4))).toBeNull();
    expect(readImageInfo(bytes(PNG_SIG))).toBeNull();
  });
});
