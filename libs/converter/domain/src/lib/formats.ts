export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type VideoFormat = 'mp4' | 'webm';
export type MediaFormat = ImageFormat | VideoFormat;
export type MediaKind = 'image' | 'video';

/** Longest header any check below needs: the EBML DocType sits within the first few dozen bytes. */
export const SNIFF_BYTES = 64;

const startsWith = (b: Uint8Array, at: number, sig: number[]) =>
  b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

const asText = (b: Uint8Array, from: number, to: number) =>
  String.fromCharCode(...b.subarray(from, Math.min(to, b.length)));

/**
 * Identifies a supported file from its leading bytes. The extension and MIME type are only hints
 * and are never consulted. Returns null for anything unsupported, including QuickTime. Matroska
 * counts as WebM-family: what can be done with the tracks is the plan's decision, not the name's.
 */
export function sniffFormat(head: Uint8Array): MediaFormat | null {
  if (startsWith(head, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (startsWith(head, 0, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(head, 0, ascii('RIFF')) && startsWith(head, 8, ascii('WEBP'))) {
    return 'webp';
  }
  if (startsWith(head, 4, ascii('ftyp'))) {
    return asText(head, 8, 12) === 'qt  ' ? null : 'mp4';
  }
  if (startsWith(head, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    // Chrome saves H.264 recordings as DocType "matroska" yet names them .webm, so both count.
    const docType = asText(head, 4, SNIFF_BYTES);
    return docType.includes('webm') || docType.includes('matroska') ? 'webm' : null;
  }
  return null;
}

const TARGETS: Record<MediaFormat, MediaFormat[]> = {
  png: ['webp', 'jpeg'],
  jpeg: ['webp', 'png'],
  webp: ['png', 'jpeg'],
  mp4: ['webm'],
  webm: ['mp4'],
};

/** The formats a file can be converted to, most useful first. */
export function targetsFor(source: MediaFormat): MediaFormat[] {
  return [...TARGETS[source]];
}

export function kindOf(format: MediaFormat): MediaKind {
  return format === 'mp4' || format === 'webm' ? 'video' : 'image';
}
