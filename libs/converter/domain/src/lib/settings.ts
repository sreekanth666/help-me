import type { VideoFormat } from './formats';
import {
  clampImageOptions,
  imageOptionsForPreset,
  type ImageOptions,
} from './image-options';
import { videoOptionsForPreset, type VideoOptions } from './video-options';

export interface Settings {
  version: 1;
  image: ImageOptions;
  video: VideoOptions;
}

export function defaultSettings(): Settings {
  return {
    version: 1,
    image: imageOptionsForPreset('balanced', 'webp'),
    video: videoOptionsForPreset('balanced', 'mp4'),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** A positive number at or above `min`, null (meaning "none"), or the fallback. */
const numOrNull = (v: unknown, min: number, fallback: number | null) =>
  v === null ? null : finite(v) ? Math.max(min, Math.round(v)) : fallback;

/**
 * Turns whatever came out of storage into valid settings. Never throws: each field that is
 * missing or the wrong type falls back to its default, so one bad value cannot reset the rest.
 */
export function parseSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isRecord(raw) || raw['version'] !== 1) return d;

  const img = isRecord(raw['image']) ? raw['image'] : {};
  const image = clampImageOptions({
    format: oneOf(img['format'], ['webp', 'jpeg', 'png'], d.image.format),
    quality: finite(img['quality']) ? img['quality'] : d.image.quality,
    lossless: bool(img['lossless'], d.image.lossless),
    maxDimension: numOrNull(img['maxDimension'], 16, d.image.maxDimension),
    background: typeof img['background'] === 'string' ? img['background'] : d.image.background,
  });

  const vid = isRecord(raw['video']) ? raw['video'] : {};
  const aud = isRecord(vid['audio']) ? vid['audio'] : {};
  const video: VideoOptions = {
    container: oneOf<VideoFormat>(vid['container'], ['mp4', 'webm'], d.video.container),
    strategy: oneOf(vid['strategy'], ['auto', 'fast-copy', 'transcode'], d.video.strategy),
    preset: oneOf(vid['preset'], ['web-small', 'balanced', 'max', 'custom'], d.video.preset),
    videoKbps: numOrNull(vid['videoKbps'], 100, d.video.videoKbps),
    maxHeight: numOrNull(vid['maxHeight'], 144, d.video.maxHeight),
    maxFps: numOrNull(vid['maxFps'], 1, d.video.maxFps),
    audio: {
      mode: oneOf(aud['mode'], ['keep', 'remove'], d.video.audio.mode),
      kbps: numOrNull(aud['kbps'], 32, d.video.audio.kbps),
    },
  };

  return { version: 1, image, video };
}
