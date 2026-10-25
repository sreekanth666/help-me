import { checkImagePixels, checkOutputSize, detectDeviceClass, limitsFor } from './limits';

describe('detectDeviceClass', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5, 'mobile'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile', 5, 'mobile'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5, 'mobile'], // iPadOS pretends to be a Mac
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0, 'desktop'],
    ['Mozilla/5.0 (X11; Linux x86_64) Chrome/120', 0, 'desktop'],
  ])('%s with %d touch points is %s', (userAgent, maxTouchPoints, expected) => {
    expect(detectDeviceClass({ userAgent, maxTouchPoints })).toBe(expected);
  });
});

describe('checkImagePixels', () => {
  it('allows ordinary photos', () => {
    expect(checkImagePixels(4000, 3000, limitsFor('desktop'))).toEqual({ ok: true });
  });

  it('refuses images over the desktop budget with advice', () => {
    const r = checkImagePixels(12000, 12000, limitsFor('desktop'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/too large/i);
  });

  it('has a much smaller budget on mobile', () => {
    expect(checkImagePixels(5000, 5000, limitsFor('mobile')).ok).toBe(false);
    expect(checkImagePixels(5000, 5000, limitsFor('desktop')).ok).toBe(true);
  });
});

describe('checkOutputSize', () => {
  const limits = limitsFor('desktop');

  it('is ok below the warning threshold', () => {
    expect(checkOutputSize(100 * 1024 * 1024, limits)).toBe('ok');
  });

  it('warns above 500 MB on desktop', () => {
    expect(checkOutputSize(600 * 1024 * 1024, limits)).toBe('warn');
  });

  it('blocks above 2 GB', () => {
    expect(checkOutputSize(3 * 1024 ** 3, limits)).toBe('block');
  });

  it('warns sooner on mobile', () => {
    expect(checkOutputSize(200 * 1024 * 1024, limitsFor('mobile'))).toBe('warn');
  });
});
