import type { AudioCodec, VideoCodec } from './codecs';
import type { VideoFormat } from './formats';

export type VideoPreset = 'web-small' | 'balanced' | 'max' | 'custom';
export type VideoStrategy = 'auto' | 'fast-copy' | 'transcode';

export interface VideoOptions {
  container: VideoFormat;
  /**
   * auto: copy a track only when it already plays everywhere in the target container.
   * fast-copy: copy whenever the codec is legal in the target container.
   * transcode: always re-encode.
   */
  strategy: VideoStrategy;
  preset: VideoPreset;
  /** Explicit video bitrate, or null to derive it from the preset. Forces a re-encode. */
  videoKbps: number | null;
  /** Output height cap, or null for none. Only applies when the source is taller. */
  maxHeight: number | null;
  /** Output frame-rate cap, or null for none. Only applies when the source is faster. */
  maxFps: number | null;
  audio: { mode: 'keep' | 'remove'; kbps: number | null };
}

const PRESETS: Record<
  Exclude<VideoPreset, 'custom'>,
  { maxHeight: number | null; maxFps: number | null }
> = {
  'web-small': { maxHeight: 720, maxFps: 30 },
  balanced: { maxHeight: 1080, maxFps: null },
  max: { maxHeight: null, maxFps: null },
};

export function videoOptionsForPreset(
  preset: Exclude<VideoPreset, 'custom'>,
  container: VideoFormat,
): VideoOptions {
  return {
    container,
    strategy: 'auto',
    preset,
    videoKbps: null,
    ...PRESETS[preset],
    audio: { mode: 'keep', kbps: null },
  };
}

type EncodableVideoCodec = Exclude<VideoCodec, 'hevc'>;

/** Bits per pixel per frame, by preset. WebCodecs has no CRF, so quality is bitrate-driven. */
const AVC_BPP = { 'web-small': 0.05, balanced: 0.09, max: 0.15 } as const;
const CODEC_FACTOR: Record<EncodableVideoCodec, number> = {
  avc: 1,
  vp9: 2 / 3,
  vp8: 0.9,
  av1: 0.5,
};
const MIN_KBPS = 300;

export function computeVideoBitrate(
  preset: VideoPreset,
  codec: VideoCodec,
  width: number,
  height: number,
  fps: number,
  sourceKbps: number | null,
): number {
  const bpp = AVC_BPP[preset === 'custom' ? 'balanced' : preset];
  const factor = CODEC_FACTOR[codec === 'hevc' ? 'avc' : codec];
  const kbps = Math.max(MIN_KBPS, Math.round((width * height * fps * bpp * factor) / 1000));
  return sourceKbps === null ? kbps : Math.min(kbps, sourceKbps);
}

const evenDown = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
const evenNearest = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Output frame size: capped at `maxHeight` (never upscaled), with even sides. Unscaled sizes round
 * down so the output never grows; scaled sizes round to the nearest even to keep the aspect ratio.
 */
export function resolveOutputSize(
  width: number,
  height: number,
  maxHeight: number | null,
): { width: number; height: number } {
  if (maxHeight === null || height <= maxHeight) {
    return { width: evenDown(width), height: evenDown(height) };
  }
  return { width: evenNearest((width * maxHeight) / height), height: evenNearest(maxHeight) };
}

export function audioKbpsFor(preset: VideoPreset, codec: AudioCodec): number {
  const aac = { 'web-small': 96, balanced: 128, max: 192, custom: 128 } as const;
  const opus = { 'web-small': 64, balanced: 128, max: 160, custom: 128 } as const;
  return (codec === 'opus' ? opus : aac)[preset];
}
