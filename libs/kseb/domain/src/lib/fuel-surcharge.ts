/**
 * Published fuel surcharge per bill month (₹/unit). These change every
 * period; a month missing here must be entered by the user, never assumed.
 */
export const fuelSurchargeRates: Record<string, string> = {
  '2025-08': '0.08',
  '2025-10': '0.10',
  '2025-12': '0.08',
  '2026-02': '0.04',
  '2026-04': '-0.01',
  '2026-06': '0.02',
  '2026-08': '0.00',
};

export function lookupFuelRate(billMonth: string): string | null {
  return fuelSurchargeRates[billMonth] ?? null;
}
