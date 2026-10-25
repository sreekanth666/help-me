import type { Capabilities } from './capabilities';
import type { AudioCodec, VideoCodec } from './codecs';
import { estimateVideoBytes } from './estimate';
import type { VideoFormat } from './formats';
import type { VideoProbe } from './probe';
import {
  audioKbpsFor,
  computeVideoBitrate,
  resolveOutputSize,
  type VideoOptions,
} from './video-options';

export type VideoTrackPlan =
  | { action: 'copy'; codec: VideoCodec }
  | { action: 'transcode'; codec: VideoCodec; kbps: number };

export type AudioTrackPlan =
  | { action: 'none' }
  | { action: 'drop' }
  | { action: 'copy'; codec: AudioCodec }
  | { action: 'transcode'; codec: AudioCodec; kbps: number };

export type PlanNoteCode =
  | 'copy-compat'
  | 'encoder-fallback'
  | 'no-video-track'
  | 'no-webcodecs'
  | 'no-video-encoder'
  | 'no-audio-encoder'
  | 'cannot-decode-video'
  | 'cannot-decode-audio';

export interface PlanNote {
  code: PlanNoteCode;
  message: string;
}

export interface VideoPlan {
  container: VideoFormat;
  video: VideoTrackPlan | null;
  audio: AudioTrackPlan;
  /** copy: nothing re-encoded. hybrid: one track copied, one re-encoded. */
  mode: 'copy' | 'transcode' | 'hybrid';
  badge: 'Fast copy' | 'Re-encoded';
  output: { width: number; height: number; fps: number };
  estimatedBytes: number | null;
  /** The conversion can still run. */
  warnings: PlanNote[];
  /** The conversion cannot run as asked. */
  blockers: PlanNote[];
}

interface TrackCodecs {
  video: VideoCodec[];
  audio: AudioCodec[];
}

/** Codecs the container can hold at all. */
const LEGAL: Record<VideoFormat, TrackCodecs> = {
  mp4: { video: ['avc', 'hevc', 'vp9', 'av1'], audio: ['aac', 'mp3', 'opus', 'flac'] },
  webm: { video: ['vp8', 'vp9', 'av1'], audio: ['opus', 'vorbis'] },
};

/** Codecs that play practically everywhere in that container. */
const COMPATIBLE: Record<VideoFormat, TrackCodecs> = {
  mp4: { video: ['avc'], audio: ['aac', 'mp3'] },
  webm: { video: ['vp8', 'vp9', 'av1'], audio: ['opus', 'vorbis'] },
};

/** Codecs we encode to, best first. */
const ENCODE_PREFERENCE: Record<VideoFormat, TrackCodecs> = {
  mp4: { video: ['avc', 'vp9', 'av1'], audio: ['aac', 'opus'] },
  webm: { video: ['vp9', 'vp8', 'av1'], audio: ['opus'] },
};

const CODEC_LABEL: Record<string, string> = {
  avc: 'H.264',
  hevc: 'HEVC',
  vp9: 'VP9',
  vp8: 'VP8',
  av1: 'AV1',
  aac: 'AAC',
  opus: 'Opus',
  vorbis: 'Vorbis',
  mp3: 'MP3',
  flac: 'FLAC',
};
const label = (codec: string) => CODEC_LABEL[codec] ?? codec;

function canCopy<T extends string>(
  strategy: VideoOptions['strategy'],
  codec: T | null,
  legal: T[],
  compatible: T[],
): boolean {
  if (codec === null || strategy === 'transcode') return false;
  return (strategy === 'fast-copy' ? legal : compatible).includes(codec);
}

function pickEncoder<T extends string>(preference: T[], available: string[]): T | null {
  return preference.find((c) => available.includes(c)) ?? null;
}

/**
 * Decides, track by track, whether to re-wrap the source untouched or re-encode it, and reports
 * what this browser cannot do. Pure: the engine only executes the result.
 */
export function buildVideoPlan(
  probe: VideoProbe,
  options: VideoOptions,
  caps: Capabilities,
): VideoPlan {
  const target = options.container;
  const warnings: PlanNote[] = [];
  const blockers: PlanNote[] = [];
  const videoEncoders = caps.webCodecs ? caps.videoEncoders : [];
  const audioEncoders = caps.webCodecs ? caps.audioEncoders : [];
  let needsWebCodecs = false;

  const heightCapped = options.maxHeight !== null && probe.height > options.maxHeight;
  const fpsCapped = options.maxFps !== null && probe.fps > options.maxFps;
  const scaled = resolveOutputSize(probe.width, probe.height, options.maxHeight);
  const outFps = fpsCapped && options.maxFps !== null ? options.maxFps : probe.fps;

  // --- video ---------------------------------------------------------------------------------
  let video: VideoTrackPlan | null = null;
  const src = probe.video;
  if (src === null) {
    blockers.push({ code: 'no-video-track', message: 'This file has no video track.' });
  } else {
    const picture = heightCapped || fpsCapped || options.videoKbps !== null;
    const copy =
      !picture && canCopy(options.strategy, src.codec, LEGAL[target].video, COMPATIBLE[target].video);
    if (copy && src.codec !== null) {
      video = { action: 'copy', codec: src.codec };
      if (!COMPATIBLE[target].video.includes(src.codec)) {
        warnings.push(copyCompatWarning());
      }
    } else {
      needsWebCodecs = true;
      const preference = ENCODE_PREFERENCE[target].video;
      const codec = pickEncoder(preference, videoEncoders);
      if (codec === null) {
        if (caps.webCodecs) {
          const rewrap =
            canCopy('fast-copy', src.codec, LEGAL[target].video, []) &&
            (probe.audio === null || options.audio.mode === 'remove' ||
              canCopy('fast-copy', probe.audio.codec, LEGAL[target].audio, []));
          blockers.push({
            code: 'no-video-encoder',
            message:
              `This browser can't encode ${label(preference[0])} video.` +
              (rewrap
                ? ' Choose Fast copy to re-wrap the file without re-encoding.'
                : ' Try a different browser, or convert to the other format.'),
          });
        }
      } else {
        if (codec !== preference[0]) {
          warnings.push({
            code: 'encoder-fallback',
            message: `This browser can't encode ${label(preference[0])}, so the video will be ${label(codec)}, which fewer players support in .${target}.`,
          });
        }
        if (!src.canDecode) {
          blockers.push({
            code: 'cannot-decode-video',
            message: `This browser can't decode this file's ${src.codec ? label(src.codec) : 'unrecognised'} video.`,
          });
        }
        video = {
          action: 'transcode',
          codec,
          kbps:
            options.videoKbps ??
            computeVideoBitrate(options.preset, codec, scaled.width, scaled.height, outFps, src.kbps),
        };
      }
    }
  }

  // --- audio ---------------------------------------------------------------------------------
  let audio: AudioTrackPlan;
  const asrc = probe.audio;
  if (asrc === null) {
    audio = { action: 'none' };
  } else if (options.audio.mode === 'remove') {
    audio = { action: 'drop' };
  } else if (canCopy(options.strategy, asrc.codec, LEGAL[target].audio, COMPATIBLE[target].audio)) {
    audio = { action: 'copy', codec: asrc.codec as AudioCodec };
    if (!COMPATIBLE[target].audio.includes(audio.codec) && !warnings.some((w) => w.code === 'copy-compat')) {
      warnings.push(copyCompatWarning());
    }
  } else {
    needsWebCodecs = true;
    const preference = ENCODE_PREFERENCE[target].audio;
    const codec = pickEncoder(preference, audioEncoders);
    if (codec === null) {
      if (caps.webCodecs) {
        blockers.push({
          code: 'no-audio-encoder',
          message: `This browser can't encode ${label(preference[0])} audio. Choose Remove audio to convert the video only.`,
        });
      }
      audio = { action: 'drop' };
    } else {
      if (codec !== preference[0]) {
        warnings.push({
          code: 'encoder-fallback',
          message: `This browser can't encode ${label(preference[0])}, so the audio will be ${label(codec)}, which fewer players support in .${target}.`,
        });
      }
      if (!asrc.canDecode) {
        blockers.push({
          code: 'cannot-decode-audio',
          message: `This browser can't decode this file's audio. Choose Remove audio to convert the video only.`,
        });
      }
      audio = {
        action: 'transcode',
        codec,
        kbps: options.audio.kbps ?? audioKbpsFor(options.preset, codec),
      };
    }
  }

  if (needsWebCodecs && !caps.webCodecs) {
    blockers.push({
      code: 'no-webcodecs',
      message: 'This browser has no WebCodecs support, so videos cannot be re-encoded. Fast copy may still work.',
    });
  }

  // --- summary -------------------------------------------------------------------------------
  const videoCopied = video?.action === 'copy';
  const audioCopied = audio.action === 'copy' || audio.action === 'none' || audio.action === 'drop';
  const mode: VideoPlan['mode'] = videoCopied && audioCopied
    ? 'copy'
    : video?.action === 'transcode' && audio.action === 'transcode'
      ? 'transcode'
      : videoCopied || audio.action === 'copy'
        ? 'hybrid'
        : 'transcode';

  const output =
    videoCopied || video === null
      ? { width: probe.width, height: probe.height, fps: probe.fps }
      : { ...scaled, fps: outFps };

  const videoKbps = video === null ? null : video.action === 'copy' ? (src?.kbps ?? null) : video.kbps;
  const audioKbps =
    audio.action === 'transcode' ? audio.kbps : audio.action === 'copy' ? (asrc?.kbps ?? null) : 0;

  return {
    container: target,
    video,
    audio,
    mode,
    badge: mode === 'copy' ? 'Fast copy' : 'Re-encoded',
    output,
    estimatedBytes: estimateVideoBytes(probe.durationSec, videoKbps, audioKbps),
    warnings,
    blockers,
  };
}

function copyCompatWarning(): PlanNote {
  return {
    code: 'copy-compat',
    message:
      'Copied as-is: this plays in modern browsers and VLC, but some players (such as QuickTime) may not open it.',
  };
}
