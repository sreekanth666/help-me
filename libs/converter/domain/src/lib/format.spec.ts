import { formatBytes, formatDuration, formatSavings } from './format';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1 MB'],
    [5.25 * 1024 * 1024, '5.3 MB'],
    [3 * 1024 ** 3, '3 GB'],
  ])('formats %d bytes as %s', (n, label) => {
    expect(formatBytes(n)).toBe(label);
  });
});

describe('formatSavings', () => {
  it('reports a reduction as a negative percentage', () => {
    expect(formatSavings(1000, 380)).toEqual({ label: '−62%', direction: 'smaller' });
  });

  it('flags a larger result in words, not just a sign', () => {
    expect(formatSavings(1000, 1120)).toEqual({ label: '+12% larger', direction: 'larger' });
  });

  it('calls an identical size the same', () => {
    expect(formatSavings(1000, 1000)).toEqual({ label: 'same size', direction: 'same' });
  });

  it('does not divide by zero for an empty input', () => {
    expect(formatSavings(0, 10)).toEqual({ label: 'same size', direction: 'same' });
  });

  it('treats a sub-percent change as the same size', () => {
    expect(formatSavings(100000, 99900).direction).toBe('same');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [65, '1:05'],
    [3725, '1:02:05'],
  ])('formats %d seconds as %s', (s, label) => {
    expect(formatDuration(s)).toBe(label);
  });
});
