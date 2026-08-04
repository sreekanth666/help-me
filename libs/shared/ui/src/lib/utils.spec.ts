import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center');
  });

  it('drops falsy values', () => {
    const isHidden = false;
    expect(cn('flex', isHidden && 'hidden', undefined, null)).toBe('flex');
  });

  it('lets the later Tailwind class win when two conflict', () => {
    // This is the whole reason cn exists: a caller's className prop must be
    // able to override a component's built-in variant classes.
    expect(cn('bg-primary', 'bg-muted')).toBe('bg-muted');
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4');
  });
});
