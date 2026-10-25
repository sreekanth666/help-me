import { detectDeviceClass } from '@helpme/converter-domain';
import type { AudioCodec, Capabilities, VideoCodec } from '@helpme/converter-domain';

const VIDEO_PROBES: [VideoCodec, string][] = [
  ['avc', 'avc1.640028'],
  ['vp9', 'vp09.00.10.08'],
  ['vp8', 'vp8'],
  ['av1', 'av01.0.04M.08'],
];
const AUDIO_PROBES: [AudioCodec, string][] = [
  ['aac', 'mp4a.40.2'],
  ['opus', 'opus'],
];

async function safely(test: () => Promise<boolean | undefined>): Promise<boolean> {
  try {
    return (await test()) === true;
  } catch {
    return false;
  }
}

async function canEncodeNativeWebp(): Promise<boolean> {
  if (typeof OffscreenCanvas === 'undefined') return false;
  return safely(async () => {
    const canvas = new OffscreenCanvas(1, 1);
    canvas.getContext('2d');
    // Browsers that cannot encode a type silently return PNG instead.
    return (await canvas.convertToBlob({ type: 'image/webp' })).type === 'image/webp';
  });
}

/**
 * Measured where the encoding actually runs (inside the worker). AAC counts as encodable when the
 * wasm encoder can stand in, which is flagged by `aacViaWasm`.
 */
export async function detectCapabilities(): Promise<Capabilities> {
  const webCodecs = typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined';

  const videoEncoders: VideoCodec[] = [];
  const audioEncoders: AudioCodec[] = [];
  let aacViaWasm = false;

  if (webCodecs) {
    const video = await Promise.all(
      VIDEO_PROBES.map(([, codec]) =>
        safely(async () =>
          (await VideoEncoder.isConfigSupported({ codec, width: 1280, height: 720, bitrate: 2_000_000, framerate: 30 })).supported,
        ),
      ),
    );
    VIDEO_PROBES.forEach(([name], i) => video[i] && videoEncoders.push(name));

    const audio = await Promise.all(
      AUDIO_PROBES.map(([, codec]) =>
        safely(async () =>
          (await AudioEncoder.isConfigSupported({ codec, numberOfChannels: 2, sampleRate: 48_000, bitrate: 128_000 })).supported,
        ),
      ),
    );
    AUDIO_PROBES.forEach(([name], i) => audio[i] && audioEncoders.push(name));

    if (!audioEncoders.includes('aac')) {
      aacViaWasm = true;
      audioEncoders.unshift('aac');
    }
  }

  return {
    webCodecs,
    videoEncoders,
    audioEncoders,
    aacViaWasm,
    nativeWebpEncode: await canEncodeNativeWebp(),
    // Only the main thread can see the file picker; the client fills this in.
    fileSystemAccess: false,
    deviceClass: detectDeviceClass({
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
    }),
  };
}
