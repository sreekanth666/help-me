import { defaultSettings, parseSettings } from './settings';

describe('parseSettings', () => {
  it('returns defaults for missing or non-object input', () => {
    expect(parseSettings(undefined)).toEqual(defaultSettings());
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('nope')).toEqual(defaultSettings());
  });

  it('returns defaults when the stored version is unknown', () => {
    expect(parseSettings({ version: 99, image: { quality: 10 } })).toEqual(defaultSettings());
  });

  it('round-trips valid settings', () => {
    const s = defaultSettings();
    s.image.quality = 60;
    s.video.strategy = 'fast-copy';
    expect(parseSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('clamps an out-of-range quality instead of rejecting everything', () => {
    const s = parseSettings({ version: 1, image: { quality: 5000 } });
    expect(s.image.quality).toBe(100);
  });

  it('replaces an invalid enum with its default and keeps the rest', () => {
    const s = parseSettings({
      version: 1,
      image: { quality: 40 },
      video: { strategy: 'warp-speed', maxFps: 24 },
    });
    expect(s.image.quality).toBe(40);
    expect(s.video.strategy).toBe(defaultSettings().video.strategy);
    expect(s.video.maxFps).toBe(24);
  });

  it('ignores values of the wrong type', () => {
    const s = parseSettings({ version: 1, image: { quality: 'high', lossless: 'yes' } });
    expect(s.image.quality).toBe(defaultSettings().image.quality);
    expect(s.image.lossless).toBe(false);
  });

  it('defaults to balanced presets, WebP images and compatibility-first MP4 video', () => {
    const d = defaultSettings();
    expect(d.version).toBe(1);
    expect(d.image).toMatchObject({ format: 'webp', quality: 82 });
    expect(d.video).toMatchObject({ container: 'mp4', strategy: 'auto', preset: 'balanced' });
  });
});
