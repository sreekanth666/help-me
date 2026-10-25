import type { AudioCodec, VideoCodec } from './codecs';
import type { VideoFormat } from './formats';

export interface VideoTrackInfo {
  /** null when the codec is not one we recognise. */
  codec: VideoCodec | null;
  /** Whether this browser can decode it. Not needed to copy the track as-is. */
  canDecode: boolean;
  kbps: number | null;
}

export interface AudioTrackInfo {
  codec: AudioCodec | null;
  canDecode: boolean;
  kbps: number | null;
}

/** What the engine reports about a video file before any conversion. */
export interface VideoProbe {
  container: VideoFormat;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  video: VideoTrackInfo | null;
  audio: AudioTrackInfo | null;
}
