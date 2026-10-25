'use client';

import {
  imageOptionsForPreset,
  videoOptionsForPreset,
  type ImagePreset,
  type Settings,
} from '@helpme/converter-domain';
import { Button } from '@helpme/ui/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@helpme/ui/components/ui/accordion';
import { Label } from '@helpme/ui/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@helpme/ui/components/ui/native-select';
import { Slider } from '@helpme/ui/components/ui/slider';
import { Switch } from '@helpme/ui/components/ui/switch';
import type { ReactNode } from 'react';

type Change = (change: (s: Settings) => Settings) => void;

const PRESETS: { id: ImagePreset; label: string }[] = [
  { id: 'web-small', label: 'Web small' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'max', label: 'Max quality' },
];

const IMAGE_SIZES = [3840, 2560, 1920, 1280, 800, 512, 256];
const HEIGHTS = [2160, 1440, 1080, 720, 480];
const FPS = [60, 30, 24];
const VIDEO_KBPS = [500, 1000, 2500, 5000, 8000];
const AUDIO_KBPS = [64, 96, 128, 192, 256];

function Segmented({
  label,
  options,
  active,
  onPick,
}: {
  label: string;
  options: { id: string; label: string }[];
  active: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.id}
          size="sm"
          variant={active === o.id ? 'default' : 'outline'}
          aria-pressed={active === o.id}
          onClick={() => onPick(o.id)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

/** A select over a numeric list where "" means "no limit / automatic". */
function NumberSelect({
  id,
  value,
  values,
  none,
  unit,
  onChange,
}: {
  id: string;
  value: number | null;
  values: number[];
  none: string;
  unit: string;
  onChange: (value: number | null) => void;
}) {
  const all = value !== null && !values.includes(value) ? [...values, value].sort((a, b) => b - a) : values;
  return (
    <NativeSelect
      id={id}
      size="sm"
      className="shrink-0"
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    >
      <NativeSelectOption value="">{none}</NativeSelectOption>
      {all.map((v) => (
        <NativeSelectOption key={v} value={String(v)}>
          {v} {unit}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-base font-medium">{title}</span>
      <span className="text-xs font-normal text-muted-foreground">{hint}</span>
    </span>
  );
}

/**
 * Settings in collapsible sections, so a long panel never hides the controls below it. The video
 * fine-tuning starts folded: most conversions only need the preset and the fast-copy switch.
 */
export function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: Change }) {
  const { image, video } = settings;
  const activeImage =
    PRESETS.find((p) => {
      const o = imageOptionsForPreset(p.id, 'webp');
      return o.quality === image.quality && o.maxDimension === image.maxDimension;
    })?.id ?? null;

  return (
    <Accordion multiple defaultValue={['images', 'video']}>
      <AccordionItem value="images">
        <AccordionTrigger>
          <SectionTitle title="Images" hint="PNG, JPEG and WebP. Metadata such as location is removed." />
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <Segmented
              label="Image preset"
              options={PRESETS}
              active={activeImage}
              onPick={(id) =>
                onChange((s) => {
                  const p = imageOptionsForPreset(id as ImagePreset, 'webp');
                  return { ...s, image: { ...s.image, quality: p.quality, maxDimension: p.maxDimension } };
                })
              }
            />
            <div className="flex flex-col gap-2">
              <Row label="Quality" htmlFor="image-quality">
                <span className="text-sm tabular-nums text-muted-foreground" data-testid="quality-value">
                  {image.quality}
                </span>
              </Row>
              <Slider
                id="image-quality"
                aria-label="Quality"
                min={1}
                max={100}
                value={[image.quality]}
                onValueChange={(v) => {
                  const q = Array.isArray(v) ? v[0] : v;
                  onChange((s) => ({ ...s, image: { ...s.image, quality: q } }));
                }}
              />
              <p className="text-xs text-muted-foreground">Applies to JPEG and lossy WebP. PNG is always lossless.</p>
            </div>
            <Row label="Resize longest side to" htmlFor="image-size">
              <NumberSelect
                id="image-size"
                value={image.maxDimension}
                values={IMAGE_SIZES}
                none="Original size"
                unit="px"
                onChange={(v) => onChange((s) => ({ ...s, image: { ...s.image, maxDimension: v } }))}
              />
            </Row>
            <Row label="Lossless WebP" htmlFor="image-lossless">
              <Switch
                id="image-lossless"
                aria-label="Lossless WebP"
                checked={image.lossless}
                onCheckedChange={(v) => onChange((s) => ({ ...s, image: { ...s.image, lossless: v } }))}
              />
            </Row>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="video">
        <AccordionTrigger>
          <SectionTitle title="Video" hint="MP4 and WebM, converted on your device." />
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <Segmented
              label="Video preset"
              options={PRESETS}
              active={video.preset === 'custom' ? null : video.preset}
              onPick={(id) =>
                onChange((s) => ({
                  ...s,
                  video: {
                    ...videoOptionsForPreset(id as 'web-small' | 'balanced' | 'max', s.video.container),
                    strategy: s.video.strategy,
                    audio: s.video.audio,
                  },
                }))
              }
            />
            <Row label="Keep original codecs (fast copy)" htmlFor="video-copy">
              <Switch
                id="video-copy"
                aria-label="Keep original codecs (fast copy)"
                checked={video.strategy === 'fast-copy'}
                onCheckedChange={(v) =>
                  onChange((s) => ({ ...s, video: { ...s.video, strategy: v ? 'fast-copy' : 'auto' } }))
                }
              />
            </Row>
            <p className="-mt-2 text-xs text-muted-foreground">
              Instant and lossless, but some players may not open the result. Off re-encodes for maximum
              compatibility.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="video-advanced">
        <AccordionTrigger>
          <SectionTitle title="Advanced video" hint="Resolution, frame rate, bitrate and audio." />
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-4">
            <Row label="Max resolution" htmlFor="video-height">
              <NumberSelect
                id="video-height"
                value={video.maxHeight}
                values={HEIGHTS}
                none="Original"
                unit="p"
                onChange={(v) => onChange((s) => ({ ...s, video: { ...s.video, maxHeight: v, preset: 'custom' } }))}
              />
            </Row>
            <Row label="Max frame rate" htmlFor="video-fps">
              <NumberSelect
                id="video-fps"
                value={video.maxFps}
                values={FPS}
                none="Original"
                unit="fps"
                onChange={(v) => onChange((s) => ({ ...s, video: { ...s.video, maxFps: v, preset: 'custom' } }))}
              />
            </Row>
            <Row label="Video bitrate" htmlFor="video-kbps">
              <NumberSelect
                id="video-kbps"
                value={video.videoKbps}
                values={VIDEO_KBPS}
                none="Automatic"
                unit="kbps"
                onChange={(v) => onChange((s) => ({ ...s, video: { ...s.video, videoKbps: v, preset: 'custom' } }))}
              />
            </Row>
            <Row label="Remove audio" htmlFor="video-mute">
              <Switch
                id="video-mute"
                aria-label="Remove audio"
                checked={video.audio.mode === 'remove'}
                onCheckedChange={(v) =>
                  onChange((s) => ({ ...s, video: { ...s.video, audio: { ...s.video.audio, mode: v ? 'remove' : 'keep' } } }))
                }
              />
            </Row>
            <Row label="Audio bitrate" htmlFor="audio-kbps">
              <NumberSelect
                id="audio-kbps"
                value={video.audio.kbps}
                values={AUDIO_KBPS}
                none="Automatic"
                unit="kbps"
                onChange={(v) =>
                  onChange((s) => ({ ...s, video: { ...s.video, audio: { ...s.video.audio, kbps: v } } }))
                }
              />
            </Row>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
