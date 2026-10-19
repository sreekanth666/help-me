/**
 * One effective-dated LT-I Domestic tariff. Every rate is expressed per
 * month; bi-monthly bills double the unit thresholds and fixed charges.
 * Rates are strings so they enter Decimal maths without float error.
 */
export interface Tariff {
  id: string;
  label: string;
  /** Inclusive bill-month bounds, `YYYY-MM`. */
  effectiveFrom: string;
  effectiveTo: string;
  /** Applied progressively up to the last slab's upper bound. */
  telescopicSlabs: { upTo: number; rate: string }[];
  /** Above the telescopic limit, one rate applies to every unit. */
  nonTelescopicBands: { upTo: number; rate: string }[];
  fixedCharges: { upTo: number; single: number; three: number }[];
  subsidy: {
    /** No subsidy at all above this monthly consumption. */
    capUnits: number;
    tiers: { upTo: number; rate: string }[];
    fixedCharge: { single: number; three: number };
  };
  dutyRate: string;
}
