import type {
  AudioCodec,
  Capabilities,
  VideoCodec,
  VideoFormat,
  VideoProbe,
} from '@helpme/converter-domain';
import { EngineError } from '../engine-error';
import type { ConvertDone, SinkSpec, VideoJob } from '../protocol';
import { toConversionOptions } from '../to-conversion-options';

const VIDEO_CODECS: VideoCodec[] = ['avc', 'hevc', 'vp9', 'vp8', 'av1'];
const AUDIO_CODECS: AudioCodec[] = ['aac', 'opus', 'vorbis', 'mp3', 'flac'];
const known = <T extends string>(list: T[], codec: string | null): T | null =>
  list.find((c) => c === codec) ?? null;

const MIME: Record<VideoFormat, string> = { mp4: 'video/mp4', webm: 'video/webm' };

let aacRegistered = false;

async function openInput(file: File) {
  const { Input, BlobSource, MP4, MATROSKA, WEBM } = await import('mediabunny');
  // Range-reads the file; nothing is loaded whole.
  return new Input({ source: new BlobSource(file), formats: [MP4, WEBM, MATROSKA] });
}

export async function probeVideo(file: File, container: VideoFormat): Promise<VideoProbe> {
  const input = await openInput(file);
  try {
    const [videoTrack, audioTrack] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ]);
    const [durationSec, videoStats, audioStats] = await Promise.all([
      input.computeDuration(),
      videoTrack?.computePacketStats(100),
      audioTrack?.computePacketStats(100),
    ]);
    const kbps = (bps: number | undefined) => (bps ? Math.round(bps / 1000) : null);

    return {
      container,
      durationSec,
      width: videoTrack?.displayWidth ?? 0,
      height: videoTrack?.displayHeight ?? 0,
      fps: videoStats?.averagePacketRate ?? 0,
      video: videoTrack
        ? {
            codec: known(VIDEO_CODECS, await videoTrack.getCodec()),
            canDecode: await videoTrack.canDecode(),
            kbps: kbps(videoStats?.averageBitrate),
          }
        : null,
      audio: audioTrack
        ? {
            codec: known(AUDIO_CODECS, await audioTrack.getCodec()),
            canDecode: await audioTrack.canDecode(),
            kbps: kbps(audioStats?.averageBitrate),
          }
        : null,
    };
  } catch {
    throw new EngineError('unsupported-input', "This browser couldn't read that video file.");
  } finally {
    input.dispose();
  }
}

export async function convertVideo(
  file: File,
  job: VideoJob,
  sink: SinkSpec,
  caps: Capabilities,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
): Promise<Omit<ConvertDone, 'ms'>> {
  const { plan, probe } = job;
  const options = toConversionOptions(plan, probe);

  const mb = await import('mediabunny');
  if (plan.audio.action === 'transcode' && plan.audio.codec === 'aac' && caps.aacViaWasm && !aacRegistered) {
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
    aacRegistered = true;
  }

  const input = await openInput(file);
  const format = plan.container === 'mp4' ? new mb.Mp4OutputFormat() : new mb.WebMOutputFormat();
  let writable: FileSystemWritableFileStream | null = null;
  let target: InstanceType<typeof mb.BufferTarget> | InstanceType<typeof mb.StreamTarget>;
  try {
    if (sink.kind === 'fs') {
      writable = await sink.handle.createWritable();
      target = new mb.StreamTarget(writable as unknown as WritableStream<import('mediabunny').StreamTargetChunk>, {
        chunked: true,
      });
    } else {
      target = new mb.BufferTarget();
    }
  } catch {
    input.dispose();
    throw new EngineError('write-failed', "Couldn't open the file you chose to save to.");
  }

  const output = new mb.Output({ format, target });
  try {
    const conversion = await mb.Conversion.init({ input, output, ...options });
    if (!conversion.isValid) {
      throw new EngineError(
        'unsupported-input',
        `This browser can't convert that file: ${conversion.discardedTracks.map((t) => t.reason).join(', ') || 'no usable tracks'}.`,
      );
    }
    const onAbort = () => void conversion.cancel();
    signal.addEventListener('abort', onAbort, { once: true });
    conversion.onProgress = onProgress;
    try {
      await conversion.execute();
    } finally {
      signal.removeEventListener('abort', onAbort);
    }

    const mime = MIME[plan.container];
    if (writable && sink.kind === 'fs') {
      try {
        await writable.close();
      } catch {
        // mediabunny already closed the stream when it finalised the output
      }
      return { blob: null, bytes: (await sink.handle.getFile()).size, mime, encoder: 'native' };
    }
    const buffer = (target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buffer) throw new EngineError('write-failed', 'The conversion produced no output.');
    const blob = new Blob([buffer], { type: mime });
    return { blob, bytes: blob.size, mime, encoder: 'native' };
  } catch (error) {
    if (writable) await writable.abort().catch(() => undefined);
    if (error instanceof mb.ConversionCanceledError) throw new DOMException('Canceled', 'AbortError');
    throw error;
  } finally {
    input.dispose();
  }
}
