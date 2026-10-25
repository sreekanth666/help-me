import type { Capabilities, VideoPlan, VideoProbe } from '@helpme/converter-domain';
import { buildVideoPlan, videoOptionsForPreset } from '@helpme/converter-domain';
import { toConversionOptions } from './to-conversion-options';

const caps: Capabilities = {
  webCodecs: true,
  videoEncoders: ['avc', 'vp9'],
  audioEncoders: ['aac', 'opus'],
  aacViaWasm: false,
  nativeWebpEncode: true,
  fileSystemAccess: false,
  deviceClass: 'desktop',
};

const probe: VideoProbe = {
  container: 'webm',
  durationSec: 30,
  width: 1920,
  height: 1080,
  fps: 60,
  video: { codec: 'vp9', canDecode: true, kbps: 4000 },
  audio: { codec: 'opus', canDecode: true, kbps: 96 },
};

const plan = (over = {}): VideoPlan =>
  buildVideoPlan(probe, { ...videoOptionsForPreset('max', 'mp4'), ...over }, caps);

describe('toConversionOptions', () => {
  it('forces a straight copy when nothing is re-encoded', () => {
    const o = toConversionOptions(plan({ strategy: 'fast-copy' }), probe);
    expect(o.copy).toEqual({ mode: 'forced' });
    expect(o.video).toEqual({});
    expect(o.audio).toEqual({});
  });

  it('re-encodes video with codec, bitrate in bits per second and the planned size', () => {
    const p = plan({ maxHeight: 720 });
    const o = toConversionOptions(p, probe);
    expect(o.video).toMatchObject({
      codec: 'avc',
      forceTranscode: true,
      width: 1280,
      height: 720,
    });
    const v = p.video;
    if (v?.action !== 'transcode') throw new Error('expected a transcode');
    expect(o.video).toMatchObject({ bitrate: v.kbps * 1000 });
  });

  it('re-encodes audio with codec and bitrate', () => {
    const o = toConversionOptions(plan({ audio: { mode: 'keep', kbps: 160 } }), probe);
    expect(o.audio).toMatchObject({ codec: 'aac', bitrate: 160_000, forceTranscode: true });
  });

  it('lets the preferred mode copy in a hybrid plan', () => {
    const o = toConversionOptions(plan({ strategy: 'fast-copy', maxHeight: 720 }), probe);
    expect(o.copy).toBeUndefined();
    expect(o.audio).toEqual({});
    expect(o.video).toMatchObject({ forceTranscode: true });
  });

  it('only sets a frame rate when it was capped', () => {
    expect(toConversionOptions(plan({ maxFps: 30 }), probe).video).toMatchObject({ frameRate: 30 });
    expect(toConversionOptions(plan(), probe).video).not.toHaveProperty('frameRate');
  });

  it('discards audio when it is dropped', () => {
    const o = toConversionOptions(plan({ audio: { mode: 'remove', kbps: null } }), probe);
    expect(o.audio).toEqual({ discard: true });
  });

  it('refuses a plan that has blockers', () => {
    const blocked = buildVideoPlan(probe, videoOptionsForPreset('max', 'mp4'), { ...caps, videoEncoders: [] });
    expect(() => toConversionOptions(blocked, probe)).toThrow(/blocked/i);
  });
});
