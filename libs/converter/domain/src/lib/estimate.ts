const CONTAINER_OVERHEAD = 1.03;

/** Rough output size from bitrates and duration, or null when a bitrate is unknown. */
export function estimateVideoBytes(
  durationSec: number,
  videoKbps: number | null,
  audioKbps: number | null,
): number | null {
  if (videoKbps === null || audioKbps === null) return null;
  const bytesPerSecond = ((videoKbps + audioKbps) * 1000) / 8;
  return Math.round(bytesPerSecond * durationSec * CONTAINER_OVERHEAD);
}
