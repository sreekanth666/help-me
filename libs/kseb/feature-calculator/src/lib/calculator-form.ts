import type {
  BillInput,
  BillingFrequency,
  MeterStatus,
  Phase,
  SpecialProfile,
} from '@helpme/kseb-domain';

/** Form state mirrors the inputs as typed, so partial entries survive. */
export interface CalculatorForm {
  phase: Phase;
  billingFrequency: BillingFrequency;
  subsidyEligible: boolean;
  specialProfile: SpecialProfile;
  connectedLoadWatts: string;
  omf: string;
  meterStatus: MeterStatus;
  initialReading: string;
  finalReading: string;
  assessedUnits: string;
  averageMonthlyConsumption: string;
  billMonth: string;
  /** Empty means "use the published rate". */
  fuelSurchargeRate: string;
  meterRent: string;
  otherCharges: string;
  arrears: string;
  surcharge: string;
  reconnectionFee: string;
  interimBills: string;
  paymentsApplied: string;
  advanceApplied: string;
  accountCredits: string;
}

export const currentMonth = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const defaultForm = (): CalculatorForm => ({
  phase: 'single',
  billingFrequency: 'bimonthly',
  subsidyEligible: true,
  specialProfile: 'none',
  connectedLoadWatts: '1693',
  omf: '1',
  meterStatus: 'working',
  initialReading: '',
  finalReading: '',
  assessedUnits: '',
  averageMonthlyConsumption: '',
  billMonth: currentMonth(),
  fuelSurchargeRate: '',
  meterRent: '',
  otherCharges: '',
  arrears: '',
  surcharge: '',
  reconnectionFee: '',
  interimBills: '',
  paymentsApplied: '',
  advanceApplied: '',
  accountCredits: '',
});

const num = (value: string): number | undefined => {
  if (value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

export function toBillInput(form: CalculatorForm): BillInput {
  return {
    phase: form.phase,
    billingFrequency: form.billingFrequency,
    billMonth: form.billMonth,
    subsidyEligible: form.subsidyEligible,
    specialProfile: form.specialProfile,
    connectedLoadWatts: num(form.connectedLoadWatts),
    meter: {
      status: form.meterStatus,
      initialReading: num(form.initialReading),
      finalReading: num(form.finalReading),
      omf: num(form.omf) ?? 1,
      assessedUnits: num(form.assessedUnits),
      averageMonthlyConsumption: num(form.averageMonthlyConsumption),
    },
    fuelSurchargeRate: num(form.fuelSurchargeRate),
    meterRent: num(form.meterRent),
    otherCharges: num(form.otherCharges),
    account: {
      arrears: num(form.arrears),
      surcharge: num(form.surcharge),
      reconnectionFee: num(form.reconnectionFee),
      interimBills: num(form.interimBills),
      paymentsApplied: num(form.paymentsApplied),
      advanceApplied: num(form.advanceApplied),
      accountCredits: num(form.accountCredits),
    },
  };
}
