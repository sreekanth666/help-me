import type { VideoPlan, VideoProbe } from '@helpme/converter-domain';
import type {
  ConversionAudioOptions,
  ConversionCopyOptions,
  ConversionVideoOptions,
} from 'mediabunny';

export interface MappedConversionOptions {
  video: ConversionVideoOptions;
  audio: ConversionAudioOptions;
  /** Set only for a pure copy, so a track that cannot be copied fails loudly instead of silently re-encoding. */
  copy?: ConversionCopyOptions;
}

/**
 * Translates a VideoPlan into mediabunny's conversion options. Type-only import of mediabunny:
 * this stays pure so it can be tested without a browser or the library loaded.
 */
export function toConversionOptions(plan: VideoPlan, probe: VideoProbe): MappedConversionOptions {
  if (plan.blockers.length > 0 || plan.video === null) {
    throw new Error(`Plan is blocked: ${plan.blockers.map((b) => b.code).join(', ') || 'no video'}`);
  }

  const video: ConversionVideoOptions =
    plan.video.action === 'copy'
      ? {}
      : {
          codec: plan.video.codec,
          bitrate: plan.video.kbps * 1000,
          width: plan.output.width,
          height: plan.output.height,
          // Without this a frame-size mismatch would letterbox; the plan already has the right ratio.
          fit: 'fill',
          forceTranscode: true,
          ...(plan.output.fps < probe.fps ? { frameRate: plan.output.fps } : {}),
        };

  let audio: ConversionAudioOptions;
  switch (plan.audio.action) {
    case 'drop':
      audio = { discard: true };
      break;
    case 'transcode':
      audio = { codec: plan.audio.codec, bitrate: plan.audio.kbps * 1000, forceTranscode: true };
      break;
    default:
      audio = {};
  }

  const copy: ConversionCopyOptions | undefined = plan.mode === 'copy' ? { mode: 'forced' } : undefined;
  return copy ? { video, audio, copy } : { video, audio };
}
