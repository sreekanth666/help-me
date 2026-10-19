import { calculateBill } from './calculate-bill';
import { slabGuide } from './slab-guide';
import { lt1Domestic2025 } from './tariffs/lt1-domestic-2025';
import type { BillInput, BillResult, LineKey } from './types';

const base = (overrides: Partial<BillInput> = {}): BillInput => ({
  phase: 'single',
  billingFrequency: 'bimonthly',
  billMonth: '2025-08',
  subsidyEligible: true,
  specialProfile: 'none',
  meter: {
    status: 'working',
    initialReading: 1000,
    finalReading: 1104,
    omf: 1,
  },
  ...overrides,
});

const withUnits = (units: number, overrides: Partial<BillInput> = {}) =>
  base({
    fuelSurchargeRate: 0,
    ...overrides,
    meter: {
      status: 'working',
      initialReading: 0,
      finalReading: units,
      omf: 1,
    },
  });

const amount = (result: BillResult, key: LineKey) =>
  result.lines.find((l) => l.key === key)?.amount;

describe('calculateBill — exact validation vectors (spec §12)', () => {
  const vectors = [
    ['2025-08', 104, 352.0, 40.0, 8.32, 35.2, 0.48, 486],
    ['2025-10', 130, 462.5, 53.0, 13.0, 46.25, 0.25, 599],
    ['2025-12', 115, 398.75, 45.5, 9.2, 39.88, -0.33, 532],
    ['2026-02', 126, 445.5, 51.0, 5.04, 44.55, -0.09, 574],
    ['2026-04', 165, 611.25, 70.5, -1.65, 61.13, -0.23, 730],
    ['2026-06', 183, 687.75, 79.5, 3.66, 68.78, 0.31, 811],
    ['2026-08', 101, 339.25, 38.5, 0.0, 33.93, 0.32, 465],
  ] as const;

  it.each(vectors)(
    '%s: %i units',
    (month, units, ec, ecs, fs, ed, roundOff, total) => {
      const result = calculateBill(
        base({
          billMonth: month,
          meter: {
            status: 'working',
            initialReading: 5000,
            finalReading: 5000 + units,
            omf: 1,
          },
        }),
      );

      expect(result.status).toBe('exact');
      expect(result.units).toEqual({ value: units, source: 'actual' });
      expect(result.fuelRate?.source).toBe('published');
      expect(amount(result, 'fixedCharge')).toBe(170);
      expect(amount(result, 'energyCharge')).toBe(ec);
      expect(amount(result, 'fixedChargeSubsidy')).toBe(-40);
      expect(amount(result, 'energyChargeSubsidy')).toBe(-ecs);
      expect(amount(result, 'fuelSurcharge')).toBe(fs);
      expect(amount(result, 'electricityDuty')).toBe(ed);
      expect(result.roundOff).toBe(roundOff);
      expect(result.billTotal).toBe(total);
      expect(result.settlement.netPayable).toBe(total);
    },
  );
});

describe('billed units', () => {
  it('uses KSEB assessment for a door-locked meter, never the zero difference', () => {
    const result = calculateBill(
      base({
        billMonth: '2025-10',
        meter: {
          status: 'door_lock',
          initialReading: 6080,
          finalReading: 6080,
          omf: 1,
          averageMonthlyConsumption: 65,
        },
      }),
    );
    expect(result.units).toEqual({ value: 130, source: 'assessed' });
    expect(result.billTotal).toBe(599);
  });

  it('prefers explicitly assessed units over the monthly average', () => {
    const result = calculateBill(
      base({
        meter: {
          status: 'faulty',
          omf: 1,
          assessedUnits: 104,
          averageMonthlyConsumption: 90,
        },
      }),
    );
    expect(result.units?.value).toBe(104);
  });

  it('is incomplete when a non-working meter has no assessment', () => {
    const result = calculateBill(
      base({
        meter: {
          status: 'estimated',
          initialReading: 10,
          finalReading: 10,
          omf: 1,
        },
      }),
    );
    expect(result.status).toBe('incomplete');
    expect(result.issues[0].code).toBe('missing-assessment');
  });

  it('rejects negative consumption', () => {
    const result = calculateBill(
      base({
        meter: {
          status: 'working',
          initialReading: 200,
          finalReading: 100,
          omf: 1,
        },
      }),
    );
    expect(result.status).toBe('incomplete');
    expect(result.issues[0].code).toBe('negative-consumption');
  });

  it('applies the meter multiplication factor', () => {
    const result = calculateBill(
      base({
        meter: {
          status: 'working',
          initialReading: 0,
          finalReading: 52,
          omf: 2,
        },
      }),
    );
    expect(result.units?.value).toBe(104);
  });
});

describe('energy and fixed charge boundaries, bi-monthly single phase', () => {
  it.each([
    [100, 335, 100],
    [101, 339.25, 170],
    [200, 760, 170],
    [201, 765.35, 210],
    [300, 1295, 210],
    [301, 1302.2, 280],
    [400, 2015, 280],
    [401, 2023.5, 320],
    [500, 2865, 320],
    [501, 3381.75, 440],
    [600, 4050, 440],
    [601, 4567.6, 480],
    [700, 5320, 480],
    [701, 5572.95, 520],
    [800, 6360, 520],
    [801, 6608.25, 570],
    [1000, 8250, 570],
    [1001, 9209.2, 620],
  ])('%i units → EC ₹%d, FC ₹%d', (units, ec, fc) => {
    const result = calculateBill(withUnits(units));
    expect(amount(result, 'energyCharge')).toBe(ec);
    expect(amount(result, 'fixedCharge')).toBe(fc);
  });
});

describe('monthly energy tariff boundaries', () => {
  it.each([
    [250, 1432.5],
    [251, 1694.25],
    [300, 2025],
    [301, 2287.6],
    [350, 2660],
    [351, 2790.45],
    [400, 3180],
    [401, 3308.25],
    [500, 4125],
    [501, 4609.2],
  ])('%i units → EC ₹%d', (units, ec) => {
    const result = calculateBill(
      withUnits(units, { billingFrequency: 'monthly' }),
    );
    expect(amount(result, 'energyCharge')).toBe(ec);
  });

  it('flags possible ToD billing above the telescopic limit', () => {
    expect(
      calculateBill(withUnits(250, { billingFrequency: 'monthly' })).status,
    ).toBe('exact');
    const above = calculateBill(
      withUnits(251, { billingFrequency: 'monthly' }),
    );
    expect(above.status).toBe('estimate');
    expect(above.issues[0].code).toBe('tod-may-apply');
  });
});

describe('subsidy', () => {
  it.each([
    ['bimonthly', 80, 28],
    ['bimonthly', 81, 28.5],
    ['bimonthly', 240, 108],
    ['bimonthly', 241, 0],
    ['monthly', 40, 14],
    ['monthly', 41, 14.5],
    ['monthly', 120, 54],
    ['monthly', 121, 0],
  ] as const)('%s %i units → energy subsidy ₹%d', (frequency, units, ecs) => {
    const result = calculateBill(
      withUnits(units, { billingFrequency: frequency }),
    );
    expect(Math.abs(amount(result, 'energyChargeSubsidy') ?? NaN)).toBe(ecs);
  });

  it('withdraws the fixed-charge subsidy above the cap', () => {
    expect(amount(calculateBill(withUnits(240)), 'fixedChargeSubsidy')).toBe(
      -40,
    );
    expect(amount(calculateBill(withUnits(241)), 'fixedChargeSubsidy')).toBe(0);
  });

  it('gives no fixed-charge subsidy to three-phase consumers', () => {
    const result = calculateBill(withUnits(104, { phase: 'three' }));
    expect(amount(result, 'fixedCharge')).toBe(350);
    expect(amount(result, 'fixedChargeSubsidy')).toBe(0);
  });

  it('omits subsidy lines when the consumer is not eligible', () => {
    const result = calculateBill(withUnits(104, { subsidyEligible: false }));
    expect(amount(result, 'energyChargeSubsidy')).toBeUndefined();
    expect(result.subtotal).toBe(170 + 352 + 35.2);
    expect(result.billTotal).toBe(557);
  });

  it('charges duty on gross energy charge, before subsidy', () => {
    const result = calculateBill(withUnits(115));
    expect(amount(result, 'electricityDuty')).toBe(39.88);
  });
});

describe('fuel surcharge', () => {
  it('is incomplete, not zero, when the month has no published rate', () => {
    const result = calculateBill(base({ billMonth: '2026-10' }));
    expect(result.status).toBe('incomplete');
    expect(result.fuelRate).toBeNull();
    expect(result.issues.map((i) => i.code)).toContain('missing-fuel-rate');
  });

  it('accepts an entered rate, including a refund', () => {
    const result = calculateBill(
      base({ billMonth: '2026-10', fuelSurchargeRate: -0.02 }),
    );
    expect(result.status).toBe('exact');
    expect(result.fuelRate).toEqual({ value: -0.02, source: 'entered' });
    expect(amount(result, 'fuelSurcharge')).toBe(-2.08);
  });
});

describe('unsupported cases', () => {
  it.each(['bpl', 'npg', 'tod', 'solar'] as const)('%s profile', (profile) => {
    const result = calculateBill(base({ specialProfile: profile }));
    expect(result.status).toBe('unsupported');
    expect(result.lines).toEqual([]);
  });

  it('a bill month outside every configured tariff', () => {
    const result = calculateBill(base({ billMonth: '2027-04' }));
    expect(result.status).toBe('unsupported');
    expect(result.issues[0].code).toBe('unsupported-tariff');
  });
});

describe('other bill charges', () => {
  it('adds meter rent and other charges as separate lines', () => {
    const result = calculateBill(base({ meterRent: 12, otherCharges: 6.5 }));
    expect(amount(result, 'meterRent')).toBe(12);
    expect(amount(result, 'otherCharges')).toBe(6.5);
    expect(result.billTotal).toBe(504);
  });
});

describe('account settlement', () => {
  const settle = (account: BillInput['account']) =>
    calculateBill(base({ account })).settlement;

  it('equals the bill total with no account activity', () => {
    expect(settle({})).toEqual({ lines: [], netPayable: 486 });
  });

  it('is zero after full payment', () => {
    expect(settle({ paymentsApplied: 486 }).netPayable).toBe(0);
  });

  it('does not subtract a payment entered as negative twice', () => {
    expect(settle({ paymentsApplied: -200 }).netPayable).toBe(286);
  });

  it('adds arrears and charges, then subtracts advance and credits', () => {
    const result = settle({
      arrears: 120.5,
      surcharge: 10,
      reconnectionFee: 50,
      interimBills: 0,
      paymentsApplied: 100,
      advanceApplied: 30,
      accountCredits: 6.5,
    });
    expect(result.netPayable).toBe(486 + 120.5 + 10 + 50 - 100 - 30 - 6.5);
    expect(result.lines.map((l) => l.key)).toEqual([
      'arrears',
      'surcharge',
      'reconnectionFee',
      'paymentsApplied',
      'advanceApplied',
      'accountCredits',
    ]);
  });
});

describe('slabGuide', () => {
  it('points at the next slab with the fixed charge and rate jump', () => {
    const guide = slabGuide(lt1Domestic2025, 2, 'single', 183, true);
    expect(guide.currentIndex).toBe(1);
    expect(guide.next).toEqual({
      atUnits: 201,
      unitsAway: 18,
      fixedCharge: { from: 170, to: 210 },
      rate: { from: 4.25, to: 5.35, flat: false },
      subsidyEnds: false,
    });
  });

  it('warns when the subsidy cap is next', () => {
    const guide = slabGuide(lt1Domestic2025, 2, 'single', 230, true);
    expect(guide.next).toMatchObject({
      atUnits: 241,
      subsidyEnds: true,
      rate: null,
    });
  });

  it('marks the switch to an all-units rate', () => {
    const guide = slabGuide(lt1Domestic2025, 2, 'single', 480, false);
    expect(guide.next?.rate).toEqual({ from: 8.5, to: 6.75, flat: true });
  });

  it('has no next threshold in the last band', () => {
    expect(
      slabGuide(lt1Domestic2025, 2, 'single', 1200, false).next,
    ).toBeNull();
  });
});
