import { buildOutputName } from './filename';

describe('buildOutputName', () => {
  it('swaps the extension', () => {
    expect(buildOutputName('photo.png', 'webp', new Set())).toBe('photo.webp');
  });

  it('only replaces the last extension', () => {
    expect(buildOutputName('my.holiday.photo.jpeg', 'webp', new Set())).toBe(
      'my.holiday.photo.webp',
    );
  });

  it('adds the extension when the input has none', () => {
    expect(buildOutputName('clip', 'mp4', new Set())).toBe('clip.mp4');
  });

  it('replaces characters that are illegal in file names', () => {
    expect(buildOutputName('a/b:c*d?.png', 'webp', new Set())).toBe('a_b_c_d_.webp');
  });

  it('falls back to a default for an empty base name', () => {
    expect(buildOutputName('.png', 'webp', new Set())).toBe('converted.webp');
  });

  it('numbers a name that is already taken, ignoring case', () => {
    const taken = new Set(['photo.webp', 'photo (1).webp']);
    expect(buildOutputName('PHOTO.png', 'webp', taken)).toBe('PHOTO (2).webp');
  });

  it('does not modify the set it is given', () => {
    const taken = new Set<string>();
    buildOutputName('a.png', 'webp', taken);
    expect(taken.size).toBe(0);
  });
});
