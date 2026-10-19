export type Phase = 'single' | 'three';
export type BillingFrequency = 'monthly' | 'bimonthly';
export type MeterStatus = 'working' | 'door_lock' | 'faulty' | 'estimated';

/** Special tariffs the engine recognises but does not price yet. */
export type SpecialProfile = 'none' | 'bpl' | 'npg' | 'tod' | 'solar';

export interface MeterInput {
  status: MeterStatus;
  initialReading?: number;
  finalReading?: number;
  /** Meter multiplication factor. */
  omf: number;
  /** Units assessed by KSEB when the reading is not valid. */
  assessedUnits?: number;
  /** Fallback when KSEB assesses from average monthly use. */
  averageMonthlyConsumption?: number;
}

export interface AccountInput {
  arrears?: number;
  surcharge?: number;
  reconnectionFee?: number;
  interimBills?: number;
  /** Subtracted amounts are positive; a negative sign is normalised away. */
  paymentsApplied?: number;
  advanceApplied?: number;
  accountCredits?: number;
}

export interface BillInput {
  phase: Phase;
  billingFrequency: BillingFrequency;
  /** Bill month as `YYYY-MM`; selects the tariff and fuel surcharge. */
  billMonth: string;
  subsidyEligible: boolean;
  specialProfile: SpecialProfile;
  connectedLoadWatts?: number;
  meter: MeterInput;
  /** Overrides the published rate for the bill month (₹/unit, may be negative). */
  fuelSurchargeRate?: number;
  meterRent?: number;
  otherCharges?: number;
  account?: AccountInput;
}

export type BillStatus = 'exact' | 'estimate' | 'incomplete' | 'unsupported';

export interface Issue {
  code:
    | 'unsupported-profile'
    | 'unsupported-tariff'
    | 'missing-readings'
    | 'negative-consumption'
    | 'missing-assessment'
    | 'missing-fuel-rate'
    | 'tod-may-apply';
  severity: 'error' | 'warning';
  message: string;
}

export type LineKey =
  | 'fixedCharge'
  | 'energyCharge'
  | 'electricityDuty'
  | 'fuelSurcharge'
  | 'meterRent'
  | 'otherCharges'
  | 'fixedChargeSubsidy'
  | 'energyChargeSubsidy'
  | 'roundOff';

export interface BillLine<K extends string = LineKey> {
  key: K;
  label: string;
  /** Signed rupees, rounded to the paisa. Subsidies are negative. */
  amount: number;
  /** Short working, e.g. `100 × ₹3.35 + 4 × ₹4.25`. */
  formula: string;
}

export type SettlementKey =
  | 'arrears'
  | 'surcharge'
  | 'reconnectionFee'
  | 'interimBills'
  | 'paymentsApplied'
  | 'advanceApplied'
  | 'accountCredits';

export interface BillResult {
  status: BillStatus;
  issues: Issue[];
  units: { value: number; source: 'actual' | 'assessed' } | null;
  tariffVersion: string | null;
  fuelRate: { value: number; source: 'published' | 'entered' } | null;
  lines: BillLine[];
  subtotal: number;
  roundOff: number;
  billTotal: number;
  settlement: {
    lines: BillLine<SettlementKey>[];
    netPayable: number;
  };
}
