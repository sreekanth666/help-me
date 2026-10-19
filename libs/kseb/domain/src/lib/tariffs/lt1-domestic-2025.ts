import type { Tariff } from './tariff';

export const lt1Domestic2025: Tariff = {
  id: 'lt1-domestic-2025',
  label: 'LT-I Domestic · Apr 2025 – Mar 2027',
  effectiveFrom: '2025-04',
  effectiveTo: '2027-03',
  telescopicSlabs: [
    { upTo: 50, rate: '3.35' },
    { upTo: 100, rate: '4.25' },
    { upTo: 150, rate: '5.35' },
    { upTo: 200, rate: '7.20' },
    { upTo: 250, rate: '8.50' },
  ],
  nonTelescopicBands: [
    { upTo: 300, rate: '6.75' },
    { upTo: 350, rate: '7.60' },
    { upTo: 400, rate: '7.95' },
    { upTo: 500, rate: '8.25' },
    { upTo: Infinity, rate: '9.20' },
  ],
  fixedCharges: [
    { upTo: 50, single: 50, three: 130 },
    { upTo: 100, single: 85, three: 175 },
    { upTo: 150, single: 105, three: 205 },
    { upTo: 200, single: 140, three: 215 },
    { upTo: 250, single: 160, three: 235 },
    { upTo: 300, single: 220, three: 240 },
    { upTo: 350, single: 240, three: 250 },
    { upTo: 400, single: 260, three: 260 },
    { upTo: 500, single: 285, three: 285 },
    { upTo: Infinity, single: 310, three: 310 },
  ],
  subsidy: {
    capUnits: 120,
    tiers: [
      { upTo: 40, rate: '0.35' },
      { upTo: 120, rate: '0.50' },
    ],
    // The order states ₹40 per bi-monthly bill; ₹20 per month is assumed.
    fixedCharge: { single: 20, three: 0 },
  },
  dutyRate: '0.10',
};
