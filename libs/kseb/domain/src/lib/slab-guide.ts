import { fixedCharge, subsidyCap, telescopicLimit } from './charges';
import type { Tariff } from './tariffs';
import type { Phase } from './types';

export interface SlabSegment {
  from: number;
  /** Inclusive upper bound; Infinity for the last band. */
  to: number;
  rate: number;
  /** Telescopic slabs charge only their own units; flat bands charge all units. */
  kind: 'telescopic' | 'flat';
}

export interface SlabGuide {
  segments: SlabSegment[];
  currentIndex: number;
  /** The next point at which the bill changes shape, if any. */
  next: {
    atUnits: number;
    unitsAway: number;
    fixedCharge: { from: number; to: number } | null;
    rate: { from: number; to: number; flat: boolean } | null;
    subsidyEnds: boolean;
  } | null;
}

function segments(tariff: Tariff, months: number): SlabSegment[] {
  const out: SlabSegment[] = [];
  let lower = 0;
  for (const slab of tariff.telescopicSlabs) {
    out.push({
      from: lower === 0 ? 0 : lower + 1,
      to: slab.upTo * months,
      rate: Number(slab.rate),
      kind: 'telescopic',
    });
    lower = slab.upTo * months;
  }
  for (const band of tariff.nonTelescopicBands) {
    out.push({
      from: lower + 1,
      to: band.upTo * months,
      rate: Number(band.rate),
      kind: 'flat',
    });
    lower = band.upTo * months;
  }
  return out;
}

const segmentIndex = (segs: SlabSegment[], units: number) =>
  segs.findIndex((s) => units <= s.to);

/**
 * Where the consumer sits on the tariff and what changes at the next
 * threshold — the single most useful hint for understanding a KSEB bill,
 * because fixed charge, rate and subsidy all jump at slab edges.
 */
export function slabGuide(
  tariff: Tariff,
  months: number,
  phase: Phase,
  units: number,
  subsidyEligible: boolean,
): SlabGuide {
  const segs = segments(tariff, months);
  const currentIndex = segmentIndex(segs, units);

  const thresholds = new Set<number>(
    segs.map((s) => s.to).filter((to) => to !== Infinity),
  );
  for (const band of tariff.fixedCharges) {
    if (band.upTo !== Infinity) thresholds.add(band.upTo * months);
  }
  const cap = subsidyCap(tariff, months);
  if (subsidyEligible) thresholds.add(cap);

  const edge = [...thresholds].sort((a, b) => a - b).find((t) => t >= units);
  if (edge === undefined) return { segments: segs, currentIndex, next: null };

  const atUnits = Math.floor(edge) + 1;
  const fcNow = fixedCharge(tariff, months, units, phase).amount.toNumber();
  const fcNext = fixedCharge(tariff, months, atUnits, phase).amount.toNumber();
  const nextSeg = segs[segmentIndex(segs, atUnits)];
  const nowSeg = segs[currentIndex];
  const crossesToFlat =
    units <= telescopicLimit(tariff, months) &&
    atUnits > telescopicLimit(tariff, months);

  return {
    segments: segs,
    currentIndex,
    next: {
      atUnits,
      unitsAway: atUnits - units,
      fixedCharge: fcNow !== fcNext ? { from: fcNow, to: fcNext } : null,
      rate:
        nextSeg !== nowSeg
          ? {
              from: nowSeg.rate,
              to: nextSeg.rate,
              flat: crossesToFlat || nextSeg.kind === 'flat',
            }
          : null,
      subsidyEnds: subsidyEligible && units <= cap && atUnits > cap,
    },
  };
}
