const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const text = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, '');
  return `${text} ${UNITS[unit]}`;
}

export interface Savings {
  label: string;
  direction: 'smaller' | 'larger' | 'same';
}

/** Compares output to input. A larger result is spelled out so it is never mistaken for a saving. */
export function formatSavings(inputBytes: number, outputBytes: number): Savings {
  if (inputBytes <= 0) return { label: 'same size', direction: 'same' };
  const percent = Math.round(((outputBytes - inputBytes) / inputBytes) * 100);
  if (percent < 0) return { label: `−${-percent}%`, direction: 'smaller' };
  if (percent > 0) return { label: `+${percent}% larger`, direction: 'larger' };
  return { label: 'same size', direction: 'same' };
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
