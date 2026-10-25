import { estimateVideoBytes } from './estimate';

describe('estimateVideoBytes', () => {
  it('is (video + audio) bitrate x duration, plus about 3% container overhead', () => {
    // (4000 + 128) kbps * 60 s / 8 * 1.03
    expect(estimateVideoBytes(60, 4000, 128)).toBe(31_888_800);
  });

  it('works without audio', () => {
    expect(estimateVideoBytes(10, 1000, 0)).toBe(1_287_500);
  });

  it('returns null when a bitrate is unknown', () => {
    expect(estimateVideoBytes(60, null, 128)).toBeNull();
  });
});
