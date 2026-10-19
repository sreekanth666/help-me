import { lt1Domestic2025 } from './lt1-domestic-2025';
import type { Tariff } from './tariff';

export type { Tariff } from './tariff';

const tariffs: Tariff[] = [lt1Domestic2025];

/** The tariff in force for a `YYYY-MM` bill month, or null if none is configured. */
export function selectTariff(billMonth: string): Tariff | null {
  return (
    tariffs.find(
      (t) => billMonth >= t.effectiveFrom && billMonth <= t.effectiveTo,
    ) ?? null
  );
}
