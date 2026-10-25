export type { AudioCodec, VideoCodec } from './lib/codecs';
export type { Capabilities } from './lib/capabilities';
export { estimateVideoBytes } from './lib/estimate';
export { buildOutputName } from './lib/filename';
export { formatBytes, formatDuration, formatSavings } from './lib/format';
export type { Savings } from './lib/format';
export {
  SNIFF_BYTES,
  kindOf,
  sniffFormat,
  targetsFor,
} from './lib/formats';
export type {
  ImageFormat,
  MediaFormat,
  MediaKind,
  VideoFormat,
} from './lib/formats';
export { readImageInfo } from './lib/image-info';
export type { ImageInfo } from './lib/image-info';
export {
  clampImageOptions,
  fitWithin,
  imageOptionsForPreset,
} from './lib/image-options';
export type { ImageOptions, ImagePreset } from './lib/image-options';
export {
  checkImagePixels,
  checkOutputSize,
  detectDeviceClass,
  limitsFor,
} from './lib/limits';
export type { DeviceClass, Limits, PixelCheck } from './lib/limits';
export { buildVideoPlan } from './lib/plan';
export type {
  AudioTrackPlan,
  PlanNote,
  PlanNoteCode,
  VideoPlan,
  VideoTrackPlan,
} from './lib/plan';
export type { AudioTrackInfo, VideoProbe, VideoTrackInfo } from './lib/probe';
export { initialQueue, nextRunnable, queueReducer } from './lib/queue';
export type {
  ItemResult,
  ItemStatus,
  QueueAction,
  QueueItem,
  QueueState,
} from './lib/queue';
export { defaultSettings, parseSettings } from './lib/settings';
export type { Settings } from './lib/settings';
export {
  audioKbpsFor,
  computeVideoBitrate,
  resolveOutputSize,
  videoOptionsForPreset,
} from './lib/video-options';
export type {
  VideoOptions,
  VideoPreset,
  VideoStrategy,
} from './lib/video-options';
