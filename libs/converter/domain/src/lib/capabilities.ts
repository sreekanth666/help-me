import type { AudioCodec, VideoCodec } from './codecs';

/** What this browser can do, measured inside the worker where encoding actually runs. */
export interface Capabilities {
  webCodecs: boolean;
  videoEncoders: VideoCodec[];
  /** Includes `aac` when the wasm AAC encoder can be loaded. */
  audioEncoders: AudioCodec[];
  aacViaWasm: boolean;
  nativeWebpEncode: boolean;
  fileSystemAccess: boolean;
  deviceClass: 'desktop' | 'mobile';
}
