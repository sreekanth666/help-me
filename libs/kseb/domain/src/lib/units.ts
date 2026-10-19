import type { Issue, MeterInput } from './types';

export type UnitsResult =
  | { ok: true; units: number; source: 'actual' | 'assessed' }
  | { ok: false; issue: Issue };

const isSet = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

/**
 * Billed units for the period. A reading difference is trusted only when the
 * meter is working; otherwise KSEB's assessment is required, because equal
 * readings on a locked or faulty meter do not mean zero consumption.
 */
export function determineUnits(
  meter: MeterInput,
  periodMonths: number,
): UnitsResult {
  if (meter.status === 'working') {
    if (!isSet(meter.initialReading) || !isSet(meter.finalReading)) {
      return {
        ok: false,
        issue: {
          code: 'missing-readings',
          severity: 'error',
          message: 'Enter both meter readings.',
        },
      };
    }
    const units = (meter.finalReading - meter.initialReading) * meter.omf;
    if (units < 0) {
      return {
        ok: false,
        issue: {
          code: 'negative-consumption',
          severity: 'error',
          message: 'Current reading is lower than the previous one.',
        },
      };
    }
    return { ok: true, units, source: 'actual' };
  }

  if (isSet(meter.assessedUnits) && meter.assessedUnits >= 0) {
    return { ok: true, units: meter.assessedUnits, source: 'assessed' };
  }
  if (
    isSet(meter.averageMonthlyConsumption) &&
    meter.averageMonthlyConsumption >= 0
  ) {
    return {
      ok: true,
      units: meter.averageMonthlyConsumption * periodMonths,
      source: 'assessed',
    };
  }
  return {
    ok: false,
    issue: {
      code: 'missing-assessment',
      severity: 'error',
      message: 'Enter the units KSEB assessed for this bill.',
    },
  };
}
