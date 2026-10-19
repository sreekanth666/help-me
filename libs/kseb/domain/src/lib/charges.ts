import { Money, money, round2, ZERO } from './money';
import type { Tariff } from './tariffs';
import type { Phase } from './types';

export interface Charge {
  amount: Money;
  formula: string;
}

const rupees = (value: Money | string | number) => {
  const v = money(value);
  return `${v.isNeg() ? '−' : ''}₹${v.abs().toFixed(2)}`;
};

const phaseLabel = (phase: Phase) =>
  phase === 'single' ? 'single phase' : 'three phase';

/** Units above which the bill switches to a flat, all-units rate. */
export const telescopicLimit = (tariff: Tariff, months: number) =>
  tariff.telescopicSlabs[tariff.telescopicSlabs.length - 1].upTo * months;

/** Applies tiered rates progressively, returning the working for each tier used. */
function progressive(
  tiers: { upTo: number; rate: string }[],
  months: number,
  units: Money,
): Charge {
  let lower = 0;
  let amount = ZERO;
  const parts: string[] = [];
  for (const tier of tiers) {
    const upper = tier.upTo * months;
    const inTier = Money.min(Money.max(units.minus(lower), 0), upper - lower);
    if (inTier.gt(0)) {
      amount = amount.plus(inTier.times(tier.rate));
      parts.push(`${inTier} × ${rupees(tier.rate)}`);
    }
    lower = upper;
  }
  return { amount: round2(amount), formula: parts.join(' + ') || '0 units' };
}

export function energyCharge(
  tariff: Tariff,
  months: number,
  units: number,
): Charge {
  const u = money(units);
  if (units <= telescopicLimit(tariff, months)) {
    return progressive(tariff.telescopicSlabs, months, u);
  }
  // Non-telescopic: the band's rate applies to every unit, not just the excess.
  const band = tariff.nonTelescopicBands.find(
    (b) => units <= b.upTo * months,
  ) as Tariff['nonTelescopicBands'][number];
  return {
    amount: round2(u.times(band.rate)),
    formula: `${units} × ${rupees(band.rate)}, all units`,
  };
}

/** Exactly one band applies; lower bands are not added together. */
export function fixedCharge(
  tariff: Tariff,
  months: number,
  units: number,
  phase: Phase,
): Charge {
  const index = tariff.fixedCharges.findIndex((b) => units <= b.upTo * months);
  const band = tariff.fixedCharges[index];
  const from =
    index === 0 ? 0 : tariff.fixedCharges[index - 1].upTo * months + 1;
  const to = band.upTo === Infinity ? '+' : `–${band.upTo * months}`;
  return {
    amount: money(band[phase] * months),
    formula: `${from}${to} units slab · ${phaseLabel(phase)}`,
  };
}

export const subsidyCap = (tariff: Tariff, months: number) =>
  tariff.subsidy.capUnits * months;

/** Subsidy is all-or-nothing: above the cap, none is granted at all. */
export function energySubsidy(
  tariff: Tariff,
  months: number,
  units: number,
): Charge {
  const cap = subsidyCap(tariff, months);
  if (units > cap) {
    return { amount: ZERO, formula: `None above ${cap} units` };
  }
  return progressive(tariff.subsidy.tiers, months, money(units));
}

export function fixedSubsidy(
  tariff: Tariff,
  months: number,
  units: number,
  phase: Phase,
): Charge {
  const cap = subsidyCap(tariff, months);
  if (units > cap) {
    return { amount: ZERO, formula: `None above ${cap} units` };
  }
  const amount = tariff.subsidy.fixedCharge[phase] * months;
  return {
    amount: money(amount),
    formula:
      amount === 0
        ? `None for ${phaseLabel(phase)}`
        : `Flat, ${phaseLabel(phase)}`,
  };
}

/** Charged on the gross energy charge, before any subsidy. */
export function electricityDuty(tariff: Tariff, energy: Money): Charge {
  const percent = money(tariff.dutyRate).times(100);
  return {
    amount: round2(energy.times(tariff.dutyRate)),
    formula: `${percent}% of ${rupees(energy)}`,
  };
}

export function fuelSurcharge(units: number, rate: string | number): Charge {
  return {
    amount: round2(money(units).times(rate)),
    formula: `${units} × ${rupees(rate)}`,
  };
}
