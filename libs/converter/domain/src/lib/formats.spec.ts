import { kindOf, sniffFormat, targetsFor } from './formats';

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));
const bytes = (...parts: (number | number[])[]) =>
  Uint8Array.from(parts.flat());

describe('sniffFormat', () => {
  it('recognises PNG by its signature', () => {
    expect(
      sniffFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe('png');
  });

  it('recognises JPEG by its SOI marker', () => {
    expect(sniffFormat(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 16))).toBe('jpeg');
  });

  it('recognises WebP as RIFF....WEBP', () => {
    expect(
      sniffFormat(bytes(ascii('RIFF'), 0, 0, 0, 0, ascii('WEBPVP8 '))),
    ).toBe('webp');
  });

  it('does not take other RIFF files (WAV) for WebP', () => {
    expect(
      sniffFormat(bytes(ascii('RIFF'), 0, 0, 0, 0, ascii('WAVEfmt '))),
    ).toBeNull();
  });

  it('recognises MP4 by an ftyp box at offset 4', () => {
    expect(
      sniffFormat(bytes(0, 0, 0, 0x20, ascii('ftyp'), ascii('isom'))),
    ).toBe('mp4');
  });

  it('rejects QuickTime .mov, which the converter does not handle yet', () => {
    expect(
      sniffFormat(bytes(0, 0, 0, 0x14, ascii('ftyp'), ascii('qt  '))),
    ).toBeNull();
  });

  it('recognises WebM as EBML with a webm DocType', () => {
    expect(
      sniffFormat(
        bytes(0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84, ascii('webm')),
      ),
    ).toBe('webm');
  });

  it('rejects Matroska, which shares the EBML header with WebM', () => {
    expect(
      sniffFormat(
        bytes(0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x88, ascii('matroska')),
      ),
    ).toBeNull();
  });

  it('returns null for unknown or too-short input', () => {
    expect(sniffFormat(bytes(1, 2, 3))).toBeNull();
    expect(sniffFormat(new Uint8Array(0))).toBeNull();
  });
});

describe('targetsFor', () => {
  it('offers the two other image formats for each image', () => {
    expect(targetsFor('png')).toEqual(['webp', 'jpeg']);
    expect(targetsFor('jpeg')).toEqual(['webp', 'png']);
    expect(targetsFor('webp')).toEqual(['png', 'jpeg']);
  });

  it('pairs MP4 with WebM only', () => {
    expect(targetsFor('mp4')).toEqual(['webm']);
    expect(targetsFor('webm')).toEqual(['mp4']);
  });
});

describe('kindOf', () => {
  it('splits formats into image and video', () => {
    expect(kindOf('png')).toBe('image');
    expect(kindOf('webp')).toBe('image');
    expect(kindOf('mp4')).toBe('video');
    expect(kindOf('webm')).toBe('video');
  });
});
