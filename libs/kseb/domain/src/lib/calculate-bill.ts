import {
  electricityDuty,
  energyCharge,
  energySubsidy,
  fixedCharge,
  fixedSubsidy,
  fuelSurcharge,
  telescopicLimit,
  type Charge,
} from './charges';
import { lookupFuelRate } from './fuel-surcharge';
import { money, roundRupee, round2, sum, ZERO } from './money';
import { selectTariff } from './tariffs';
import type {
  AccountInput,
  BillInput,
  BillLine,
  BillResult,
  Issue,
  LineKey,
  SettlementKey,
} from './types';
import { determineUnits } from './units';

export const periodMonths = (input: Pick<BillInput, 'billingFrequency'>) =>
  input.billingFrequency === 'bimonthly' ? 2 : 1;

const emptyResult = (
  status: BillResult['status'],
  issues: Issue[],
  tariffVersion: string | null = null,
): BillResult => ({
  status,
  issues,
  units: null,
  tariffVersion,
  fuelRate: null,
  lines: [],
  subtotal: 0,
  roundOff: 0,
  billTotal: 0,
  settlement: { lines: [], netPayable: 0 },
});

const line = <K extends string>(
  key: K,
  label: string,
  charge: Charge,
  sign: 1 | -1 = 1,
): BillLine<K> => ({
  key,
  label,
  // `|| 0` folds the -0 of a negated zero subsidy back to 0.
  amount: charge.amount.times(sign).toNumber() || 0,
  formula: charge.formula,
});

const flat = (amount: number | undefined, formula: string): Charge => ({
  amount: round2(money(amount ?? 0)),
  formula,
});

/**
 * Prices one LT-I Domestic bill and, separately, the account settlement.
 * Follows the reference pipeline in the KSEB calculator spec, §11.
 */
export function calculateBill(input: BillInput): BillResult {
  if (input.specialProfile !== 'none') {
    return emptyResult('unsupported', [
      {
        code: 'unsupported-profile',
        severity: 'error',
        message: 'This special tariff is not supported yet.',
      },
    ]);
  }

  const tariff = selectTariff(input.billMonth);
  if (!tariff) {
    return emptyResult('unsupported', [
      {
        code: 'unsupported-tariff',
        severity: 'error',
        message: 'No tariff is configured for this bill month.',
      },
    ]);
  }

  const months = periodMonths(input);
  const measured = determineUnits(input.meter, months);
  if (!measured.ok) {
    return emptyResult('incomplete', [measured.issue], tariff.label);
  }
  const { units } = measured;
  const issues: Issue[] = [];

  if (units > telescopicLimit(tariff, months)) {
    issues.push({
      code: 'tod-may-apply',
      severity: 'warning',
      message: `Above ${telescopicLimit(tariff, months)} units, KSEB may bill by time of day.`,
    });
  }

  const publishedRate = lookupFuelRate(input.billMonth);
  const enteredRate =
    input.fuelSurchargeRate !== undefined &&
    Number.isFinite(input.fuelSurchargeRate)
      ? input.fuelSurchargeRate
      : null;
  const fuelRate =
    enteredRate !== null
      ? { value: enteredRate, source: 'entered' as const }
      : publishedRate !== null
        ? { value: Number(publishedRate), source: 'published' as const }
        : null;
  if (!fuelRate) {
    issues.push({
      code: 'missing-fuel-rate',
      severity: 'error',
      message: "Enter this month's fuel surcharge from your bill.",
    });
  }

  const fc = fixedCharge(tariff, months, units, input.phase);
  const ec = energyCharge(tariff, months, units);
  const ed = electricityDuty(tariff, ec.amount);
  const fs = fuelRate
    ? fuelSurcharge(units, fuelRate.value)
    : { amount: ZERO, formula: 'Rate needed' };

  const lines: BillLine<LineKey>[] = [
    line('fixedCharge', 'Fixed charge', fc),
    line('energyCharge', 'Energy charge', ec),
    line('electricityDuty', 'Electricity duty', ed),
    line('fuelSurcharge', 'Fuel surcharge', fs),
  ];
  if (input.meterRent) {
    lines.push(
      line('meterRent', 'Meter rent', flat(input.meterRent, 'As billed')),
    );
  }
  if (input.otherCharges) {
    lines.push(
      line(
        'otherCharges',
        'Other charges',
        flat(input.otherCharges, 'As billed'),
      ),
    );
  }
  if (input.subsidyEligible) {
    lines.push(
      line(
        'fixedChargeSubsidy',
        'Fixed charge subsidy',
        fixedSubsidy(tariff, months, units, input.phase),
        -1,
      ),
      line(
        'energyChargeSubsidy',
        'Energy subsidy',
        energySubsidy(tariff, months, units),
        -1,
      ),
    );
  }

  // Sum the rounded line items, then round the subtotal to the rupee.
  const subtotal = sum(lines.map((l) => money(l.amount)));
  const billTotal = roundRupee(subtotal);
  const roundOff = billTotal.minus(subtotal);
  lines.push({
    key: 'roundOff',
    label: 'Round off',
    amount: roundOff.toNumber() || 0,
    formula: `₹${subtotal.toFixed(2)} → ₹${billTotal.toFixed(0)}`,
  });

  const settlement = settle(billTotal.toNumber(), input.account ?? {});
  const hasError = issues.some((i) => i.severity === 'error');

  return {
    status: hasError ? 'incomplete' : issues.length ? 'estimate' : 'exact',
    issues,
    units: { value: units, source: measured.source },
    tariffVersion: tariff.label,
    fuelRate,
    lines,
    subtotal: subtotal.toNumber(),
    roundOff: roundOff.toNumber() || 0,
    billTotal: billTotal.toNumber(),
    settlement,
  };
}

const settlementItems: [SettlementKey, string, 1 | -1][] = [
  ['arrears', 'Arrears', 1],
  ['surcharge', 'Surcharge', 1],
  ['reconnectionFee', 'Reconnection fee', 1],
  ['interimBills', 'Interim bills', 1],
  ['paymentsApplied', 'Payments', -1],
  ['advanceApplied', 'Advance', -1],
  ['accountCredits', 'Credits', -1],
];

/** Kept apart from the bill itself: the bill total never includes these. */
export function settle(
  billTotal: number,
  account: AccountInput,
): BillResult['settlement'] {
  const lines = settlementItems
    .filter(([key]) => account[key])
    .map(([key, label, sign]) => {
      // Subtracted amounts are taken as positive whatever sign was entered,
      // so a payment shown as negative on an invoice is not subtracted twice.
      const entered = money(account[key] ?? 0);
      const value = round2(sign === -1 ? entered.abs() : entered);
      return line(key, label, { amount: value, formula: '' }, sign);
    });
  const netPayable = sum([
    money(billTotal),
    ...lines.map((l) => money(l.amount)),
  ]);
  return { lines, netPayable: netPayable.toNumber() };
}
