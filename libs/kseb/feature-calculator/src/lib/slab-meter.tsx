import type { SlabGuide } from '@helpme/kseb-domain';
import { cn } from '@helpme/ui/lib/utils';

import { formatMoney, formatUnits } from './format';

/** Share of the track given to slabs charged progressively. */
const TELESCOPIC_SHARE = 60;

interface Placed {
  start: number;
  width: number;
  lower: number;
  upper: number;
  kind: 'telescopic' | 'flat';
}

function place(guide: SlabGuide): Placed[] {
  const tele = guide.segments.filter((s) => s.kind === 'telescopic');
  const flat = guide.segments.filter((s) => s.kind === 'flat');
  let start = 0;
  let lower = 0;
  return guide.segments.map((s) => {
    const share =
      s.kind === 'telescopic'
        ? TELESCOPIC_SHARE / tele.length
        : (100 - TELESCOPIC_SHARE) / flat.length;
    // The open-ended last band is drawn as a quarter beyond its start.
    const upper = s.to === Infinity ? lower * 1.25 : s.to;
    const placed = { start, width: share, lower, upper, kind: s.kind };
    start += share;
    lower = s.to;
    return placed;
  });
}

function markerPercent(placed: Placed[], index: number, units: number) {
  const p = placed[index];
  const fraction = Math.min((units - p.lower) / (p.upper - p.lower), 1);
  return p.start + Math.max(fraction, 0) * p.width;
}

function hint(guide: SlabGuide, units: number): string {
  const current = guide.segments[guide.currentIndex];
  if (!guide.next) {
    return `All ${formatUnits(units)} units at ${formatMoney(current.rate)}`;
  }
  const { unitsAway, fixedCharge, rate, subsidyEnds } = guide.next;
  const changes: string[] = [];
  if (rate) {
    changes.push(
      rate.flat
        ? `every unit at ${formatMoney(rate.to)}`
        : `rate ${formatMoney(rate.to)}/unit`,
    );
  }
  if (fixedCharge) changes.push(`fixed charge ${formatMoney(fixedCharge.to)}`);
  if (subsidyEnds) changes.push('subsidy ends');
  const away = `${formatUnits(unitsAway)} more ${unitsAway === 1 ? 'unit' : 'units'}`;
  return changes.length ? `${away}: ${changes.join(', ')}` : '';
}

export function SlabMeter({
  guide,
  units,
}: {
  guide: SlabGuide;
  units: number;
}) {
  const placed = place(guide);
  const marker = markerPercent(placed, guide.currentIndex, units);
  const telescopicEnd = placed.filter((p) => p.kind === 'telescopic').at(-1);
  const lastFinite = guide.segments.at(-2)?.to;
  const flatNow = guide.segments[guide.currentIndex].kind === 'flat';

  return (
    <figure className="flex flex-col gap-2" aria-label="Tariff slab position">
      <div className="relative pt-1">
        <div className="flex h-2.5 gap-0.5" aria-hidden="true">
          {placed.map((p, i) => (
            <div
              key={i}
              style={{ width: `${p.width}%` }}
              className={cn(
                'relative h-full overflow-hidden bg-muted first:rounded-l-full last:rounded-r-full',
                p.kind === 'flat' &&
                  i === guide.segments.findIndex((s) => s.kind === 'flat') &&
                  'ml-1.5',
              )}
            >
              <div
                className={cn(
                  'absolute inset-y-0 left-0',
                  flatNow ? 'bg-destructive/70' : 'bg-primary',
                )}
                style={{
                  width:
                    i < guide.currentIndex
                      ? '100%'
                      : i === guide.currentIndex
                        ? `${((marker - p.start) / p.width) * 100}%`
                        : '0%',
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-4 text-xs text-muted-foreground tabular-nums">
        <span className="absolute left-0">0</span>
        {telescopicEnd && (
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${telescopicEnd.start + telescopicEnd.width}%` }}
          >
            {telescopicEnd.upper}
          </span>
        )}
        {lastFinite && <span className="absolute right-0">{lastFinite}+</span>}
      </div>
      <figcaption className="text-sm text-muted-foreground">
        {flatNow && guide.next
          ? `All units at ${formatMoney(guide.segments[guide.currentIndex].rate)}. ${hint(guide, units)}`
          : hint(guide, units)}
      </figcaption>
    </figure>
  );
}
