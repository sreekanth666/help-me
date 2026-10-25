import {
  computeVideoBitrate,
  resolveOutputSize,
  videoOptionsForPreset,
} from './video-options';

describe('videoOptionsForPreset', () => {
  it('web-small caps at 720p and 30fps', () => {
    expect(videoOptionsForPreset('web-small', 'mp4')).toMatchObject({
      container: 'mp4',
      strategy: 'auto',
      preset: 'web-small',
      maxHeight: 720,
      maxFps: 30,
      videoKbps: null,
    });
  });

  it('balanced caps at 1080p with no fps cap', () => {
    expect(videoOptionsForPreset('balanced', 'webm')).toMatchObject({
      maxHeight: 1080,
      maxFps: null,
    });
  });

  it('max caps nothing and keeps audio by default', () => {
    expect(videoOptionsForPreset('max', 'mp4')).toMatchObject({
      maxHeight: null,
      maxFps: null,
      audio: { mode: 'keep', kbps: null },
    });
  });
});

describe('computeVideoBitrate', () => {
  it('uses pixels x fps x bits-per-pixel for the codec and preset', () => {
    // 1920*1080*30*0.09 = 5.6 Mbps
    expect(computeVideoBitrate('balanced', 'avc', 1920, 1080, 30, null)).toBe(5599);
    // 1280*720*30*0.05 = 1.4 Mbps
    expect(computeVideoBitrate('web-small', 'avc', 1280, 720, 30, null)).toBe(1382);
  });

  it('asks VP9 for less than H.264 at the same quality', () => {
    const avc = computeVideoBitrate('balanced', 'avc', 1920, 1080, 30, null);
    const vp9 = computeVideoBitrate('balanced', 'vp9', 1920, 1080, 30, null);
    expect(vp9).toBeLessThan(avc);
  });

  it('never goes below 300 kbps', () => {
    expect(computeVideoBitrate('web-small', 'avc', 320, 240, 15, null)).toBe(300);
  });

  it('never exceeds the source bitrate, so a re-encode cannot bloat the file', () => {
    expect(computeVideoBitrate('max', 'avc', 1920, 1080, 30, 2000)).toBe(2000);
  });

  it('treats custom like balanced', () => {
    expect(computeVideoBitrate('custom', 'avc', 1920, 1080, 30, null)).toBe(5599);
  });
});

describe('resolveOutputSize', () => {
  it('scales down to the height cap and keeps the aspect ratio', () => {
    expect(resolveOutputSize(1920, 1080, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('never upscales', () => {
    expect(resolveOutputSize(1280, 720, 1080)).toEqual({ width: 1280, height: 720 });
  });

  it('rounds to even numbers, which video codecs require', () => {
    expect(resolveOutputSize(1000, 563, 360)).toEqual({ width: 640, height: 360 });
    expect(resolveOutputSize(641, 361, null)).toEqual({ width: 640, height: 360 });
  });
});
