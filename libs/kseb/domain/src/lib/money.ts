import Decimal from 'decimal.js';

/**
 * All currency maths runs through Decimal: binary floats cannot represent
 * rates like 0.35 exactly, and KSEB bills are compared to the paisa.
 */
export const Money = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});
export type Money = Decimal;

export const money = (value: Decimal.Value): Money => new Money(value);

export const ZERO = money(0);

/** Line items are shown to the paisa. */
export const round2 = (value: Money): Money =>
  value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** The bill total is rounded to the whole rupee. */
export const roundRupee = (value: Money): Money =>
  value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

export const sum = (values: Money[]): Money =>
  values.reduce((total, value) => total.plus(value), ZERO);
