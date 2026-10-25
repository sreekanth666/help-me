import type { Capabilities } from './capabilities';
import { buildVideoPlan } from './plan';
import type { VideoProbe } from './probe';
import { videoOptionsForPreset, type VideoOptions } from './video-options';

const caps = (over: Partial<Capabilities> = {}): Capabilities => ({
  webCodecs: true,
  videoEncoders: ['avc', 'vp9', 'vp8', 'av1'],
  audioEncoders: ['aac', 'opus'],
  aacViaWasm: false,
  nativeWebpEncode: true,
  fileSystemAccess: true,
  deviceClass: 'desktop',
  ...over,
});

const mp4Source = (over: Partial<VideoProbe> = {}): VideoProbe => ({
  container: 'mp4',
  durationSec: 60,
  width: 1280,
  height: 720,
  fps: 30,
  video: { codec: 'avc', canDecode: true, kbps: 2000 },
  audio: { codec: 'aac', canDecode: true, kbps: 128 },
  ...over,
});

const webmSource = (over: Partial<VideoProbe> = {}): VideoProbe => ({
  container: 'webm',
  durationSec: 60,
  width: 1280,
  height: 720,
  fps: 30,
  video: { codec: 'vp9', canDecode: true, kbps: 2000 },
  audio: { codec: 'opus', canDecode: true, kbps: 96 },
  ...over,
});

const opts = (over: Partial<VideoOptions> = {}): VideoOptions => ({
  ...videoOptionsForPreset('max', 'mp4'),
  ...over,
});

describe('buildVideoPlan: MP4 to WebM', () => {
  const plan = buildVideoPlan(mp4Source(), opts({ container: 'webm' }), caps());

  it('re-encodes H.264/AAC to VP9/Opus, since WebM cannot hold them', () => {
    expect(plan.mode).toBe('transcode');
    expect(plan.video).toMatchObject({ action: 'transcode', codec: 'vp9' });
    expect(plan.audio).toMatchObject({ action: 'transcode', codec: 'opus' });
    expect(plan.blockers).toEqual([]);
  });

  it('badges the result as re-encoded', () => {
    expect(plan.badge).toBe('Re-encoded');
  });

  it('asks for a bitrate no higher than the source', () => {
    expect(plan.video).toMatchObject({ action: 'transcode' });
    if (plan.video?.action === 'transcode') {
      expect(plan.video.kbps).toBeLessThanOrEqual(2000);
    }
  });
});

describe('buildVideoPlan: WebM to MP4', () => {
  it('auto re-encodes to H.264 + AAC for compatibility', () => {
    const plan = buildVideoPlan(webmSource(), opts(), caps());
    expect(plan.mode).toBe('transcode');
    expect(plan.video).toMatchObject({ action: 'transcode', codec: 'avc' });
    expect(plan.audio).toMatchObject({ action: 'transcode', codec: 'aac' });
  });

  it('fast-copy re-wraps VP9 + Opus untouched, and warns about player support', () => {
    const plan = buildVideoPlan(webmSource(), opts({ strategy: 'fast-copy' }), caps());
    expect(plan.mode).toBe('copy');
    expect(plan.badge).toBe('Fast copy');
    expect(plan.video).toEqual({ action: 'copy', codec: 'vp9' });
    expect(plan.audio).toEqual({ action: 'copy', codec: 'opus' });
    expect(plan.warnings.map((w) => w.code)).toContain('copy-compat');
  });

  it('auto copies a track that already plays everywhere (H.264 in MP4 target)', () => {
    const plan = buildVideoPlan(
      webmSource({ video: { codec: 'avc', canDecode: true, kbps: 2000 } }),
      opts(),
      caps(),
    );
    expect(plan.video).toEqual({ action: 'copy', codec: 'avc' });
    expect(plan.audio).toMatchObject({ action: 'transcode', codec: 'aac' });
    expect(plan.mode).toBe('hybrid');
  });

  it('transcode strategy never copies', () => {
    const plan = buildVideoPlan(
      webmSource(),
      opts({ strategy: 'transcode', container: 'webm' }),
      caps(),
    );
    expect(plan.video?.action).toBe('transcode');
    expect(plan.audio.action).toBe('transcode');
  });
});

describe('buildVideoPlan: options that change the picture force a re-encode', () => {
  const copyOpts = (over: Partial<VideoOptions>) => opts({ strategy: 'fast-copy', ...over });

  it('a height cap below the source height', () => {
    const plan = buildVideoPlan(webmSource({ height: 1080, width: 1920 }), copyOpts({ maxHeight: 720 }), caps());
    expect(plan.video?.action).toBe('transcode');
    expect(plan.audio.action).toBe('copy');
    expect(plan.mode).toBe('hybrid');
    expect(plan.output).toMatchObject({ width: 1280, height: 720 });
  });

  it('but not a cap the source already satisfies', () => {
    const plan = buildVideoPlan(webmSource(), copyOpts({ maxHeight: 1080 }), caps());
    expect(plan.video?.action).toBe('copy');
  });

  it('an fps cap below the source fps', () => {
    const plan = buildVideoPlan(webmSource({ fps: 60 }), copyOpts({ maxFps: 30 }), caps());
    expect(plan.video?.action).toBe('transcode');
    expect(plan.output.fps).toBe(30);
  });

  it('an explicit bitrate, which is used as given', () => {
    const plan = buildVideoPlan(webmSource(), copyOpts({ videoKbps: 800 }), caps());
    expect(plan.video).toMatchObject({ action: 'transcode', kbps: 800 });
  });
});

describe('buildVideoPlan: audio', () => {
  it('drops audio when asked, keeping a pure copy', () => {
    const plan = buildVideoPlan(
      webmSource(),
      opts({ strategy: 'fast-copy', audio: { mode: 'remove', kbps: null } }),
      caps(),
    );
    expect(plan.audio).toEqual({ action: 'drop' });
    expect(plan.mode).toBe('copy');
  });

  it('plans no audio for a silent source', () => {
    const plan = buildVideoPlan(webmSource({ audio: null }), opts(), caps());
    expect(plan.audio).toEqual({ action: 'none' });
  });

  it('uses the audio bitrate the user chose', () => {
    const plan = buildVideoPlan(
      webmSource(),
      opts({ audio: { mode: 'keep', kbps: 160 } }),
      caps(),
    );
    expect(plan.audio).toMatchObject({ action: 'transcode', kbps: 160 });
  });
});

describe('buildVideoPlan: this browser cannot encode what we would like', () => {
  it('falls back to VP9 in MP4 when H.264 cannot be encoded, and says so', () => {
    const plan = buildVideoPlan(
      webmSource({ width: 1920, height: 1080 }),
      opts(),
      caps({ videoEncoders: ['vp9', 'vp8'] }),
    );
    expect(plan.video).toMatchObject({ action: 'transcode', codec: 'vp9' });
    expect(plan.warnings.map((w) => w.code)).toContain('encoder-fallback');
  });

  it('blocks when no suitable video encoder exists, and points at fast copy if legal', () => {
    const plan = buildVideoPlan(webmSource(), opts(), caps({ videoEncoders: [] }));
    expect(plan.blockers.map((b) => b.code)).toContain('no-video-encoder');
    expect(plan.blockers.find((b) => b.code === 'no-video-encoder')?.message).toMatch(/fast copy/i);
  });

  it('falls back to Opus in MP4 when AAC cannot be encoded', () => {
    const plan = buildVideoPlan(
      webmSource({ audio: { codec: 'vorbis', canDecode: true, kbps: 96 } }),
      opts(),
      caps({ audioEncoders: ['opus'] }),
    );
    expect(plan.audio).toMatchObject({ action: 'transcode', codec: 'opus' });
    expect(plan.warnings.map((w) => w.code)).toContain('encoder-fallback');
  });

  it('blocks when there is no audio encoder at all, suggesting to remove audio', () => {
    const plan = buildVideoPlan(webmSource(), opts(), caps({ audioEncoders: [] }));
    const b = plan.blockers.find((x) => x.code === 'no-audio-encoder');
    expect(b?.message).toMatch(/remove audio/i);
  });

  it('blocks everything when WebCodecs is missing but copying still works', () => {
    const noCodecs = caps({ webCodecs: false, videoEncoders: [], audioEncoders: [] });
    expect(buildVideoPlan(webmSource(), opts(), noCodecs).blockers).not.toEqual([]);
    const copy = buildVideoPlan(webmSource(), opts({ strategy: 'fast-copy' }), noCodecs);
    expect(copy.blockers).toEqual([]);
  });
});

describe('buildVideoPlan: this browser cannot decode the source', () => {
  const undecodable = webmSource({ video: { codec: 'vp9', canDecode: false, kbps: 2000 } });

  it('blocks a re-encode', () => {
    const plan = buildVideoPlan(undecodable, opts(), caps());
    expect(plan.blockers.map((b) => b.code)).toContain('cannot-decode-video');
  });

  it('does not block a straight copy, which needs no decoder', () => {
    const plan = buildVideoPlan(undecodable, opts({ strategy: 'fast-copy' }), caps());
    expect(plan.blockers).toEqual([]);
  });
});

describe('buildVideoPlan: unusable sources', () => {
  it('blocks a file with no video track', () => {
    const plan = buildVideoPlan(webmSource({ video: null }), opts(), caps());
    expect(plan.blockers.map((b) => b.code)).toContain('no-video-track');
  });

  it('treats an unrecognised codec as one that must be re-encoded', () => {
    const plan = buildVideoPlan(
      webmSource({ video: { codec: null, canDecode: true, kbps: null } }),
      opts({ strategy: 'fast-copy' }),
      caps(),
    );
    expect(plan.video?.action).toBe('transcode');
  });
});

describe('buildVideoPlan: size estimate', () => {
  it('uses the source bitrates for a copy', () => {
    const plan = buildVideoPlan(webmSource(), opts({ strategy: 'fast-copy' }), caps());
    // (2000 + 96) kbps * 60 s * 125 B/s per kbps * 1.03
    expect(plan.estimatedBytes).toBe(16_191_600);
  });
});
