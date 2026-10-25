import {
  clampImageOptions,
  fitWithin,
  imageOptionsForPreset,
  type ImageOptions,
} from './image-options';

describe('fitWithin', () => {
  it('scales the longest side down to the limit, keeping the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
    expect(fitWithin(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 });
  });

  it('never upscales', () => {
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 });
  });

  it('leaves the size alone when there is no limit', () => {
    expect(fitWithin(4000, 3000, null)).toEqual({ width: 4000, height: 3000 });
  });

  it('never rounds a side down to zero', () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('imageOptionsForPreset', () => {
  it('web-small is lower quality and capped at 1920px', () => {
    const o = imageOptionsForPreset('web-small', 'webp');
    expect(o).toMatchObject({ format: 'webp', quality: 75, maxDimension: 1920 });
  });

  it('balanced is the default quality with no resize', () => {
    expect(imageOptionsForPreset('balanced', 'jpeg')).toMatchObject({
      quality: 82,
      maxDimension: null,
    });
  });

  it('max keeps the highest lossy quality', () => {
    expect(imageOptionsForPreset('max', 'webp').quality).toBe(92);
  });

  it('uses the lower JPEG quality for web-small JPEG output', () => {
    expect(imageOptionsForPreset('web-small', 'jpeg').quality).toBe(72);
  });

  it('starts lossless off and the background white', () => {
    const o = imageOptionsForPreset('balanced', 'webp');
    expect(o.lossless).toBe(false);
    expect(o.background).toBe('#ffffff');
  });
});

describe('clampImageOptions', () => {
  const base: ImageOptions = imageOptionsForPreset('balanced', 'webp');

  it('keeps quality within 1-100 as an integer', () => {
    expect(clampImageOptions({ ...base, quality: 250 }).quality).toBe(100);
    expect(clampImageOptions({ ...base, quality: -3 }).quality).toBe(1);
    expect(clampImageOptions({ ...base, quality: 80.6 }).quality).toBe(81);
  });

  it('drops lossless for formats other than webp', () => {
    expect(clampImageOptions({ ...base, format: 'jpeg', lossless: true }).lossless).toBe(false);
  });

  it('floors a tiny max dimension and rounds it', () => {
    expect(clampImageOptions({ ...base, maxDimension: 3 }).maxDimension).toBe(16);
    expect(clampImageOptions({ ...base, maxDimension: 1000.4 }).maxDimension).toBe(1000);
  });

  it('treats a non-finite quality as the default', () => {
    expect(clampImageOptions({ ...base, quality: Number.NaN }).quality).toBe(82);
  });

  it('falls back to white for a malformed background', () => {
    expect(clampImageOptions({ ...base, background: 'red; drop' }).background).toBe('#ffffff');
  });
});
