'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDownIcon, InfoIcon, RotateCcwIcon } from 'lucide-react';

import {
  calculateBill,
  lookupFuelRate,
  periodMonths,
  selectTariff,
  slabGuide,
  type MeterStatus,
  type SpecialProfile,
} from '@helpme/kseb-domain';
import { ModeToggle } from '@helpme/ui/components/mode-toggle';
import { Alert, AlertDescription } from '@helpme/ui/components/ui/alert';
import { Button } from '@helpme/ui/components/ui/button';
import { Card, CardContent } from '@helpme/ui/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@helpme/ui/components/ui/collapsible';
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@helpme/ui/components/ui/field';
import { Input } from '@helpme/ui/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@helpme/ui/components/ui/native-select';
import { Separator } from '@helpme/ui/components/ui/separator';
import { Switch } from '@helpme/ui/components/ui/switch';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@helpme/ui/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@helpme/ui/components/ui/tooltip';

import { BillSummary } from './bill-summary';
import { toBillInput, type CalculatorForm } from './calculator-form';
import { formatMoney, formatRupees, formatUnits } from './format';
import { useCalculatorForm } from './use-calculator-form';

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="inline-flex text-muted-foreground hover:text-foreground"
      >
        <InfoIcon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{children}</TooltipContent>
    </Tooltip>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      spacing={0}
      value={[value]}
      onValueChange={(next: string[]) => next[0] && onChange(next[0] as T)}
    >
      {options.map((o) => (
        <ToggleGroupItem key={o.value} value={o.value}>
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function NumberField({
  label,
  value,
  onChange,
  description,
  placeholder,
  info,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: ReactNode;
  placeholder?: string;
  info?: ReactNode;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {info && <Info label={`About ${label.toLowerCase()}`}>{info}</Info>}
      </FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="tabular-nums"
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronDownIcon className="size-4 transition-transform group-data-[panel-open]:rotate-180" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Whether any part of the element is on screen. */
function useInView(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

const meterStatuses: { value: MeterStatus; label: string }[] = [
  { value: 'working', label: 'Working' },
  { value: 'door_lock', label: 'Door locked' },
  { value: 'faulty', label: 'Faulty' },
  { value: 'estimated', label: 'Estimated by KSEB' },
];

const specialProfiles: { value: SpecialProfile; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'bpl', label: 'BPL household' },
  { value: 'npg', label: 'Non-paying group' },
  { value: 'tod', label: 'Time of day (ToD) meter' },
  { value: 'solar', label: 'Solar prosumer' },
];

const monthName = (billMonth: string) => {
  const [y, m] = billMonth.split('-').map(Number);
  if (!y || !m) return billMonth;
  return new Date(y, m - 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
};

export function KsebCalculator() {
  const { form, update, reset } = useCalculatorForm();
  const set =
    <K extends keyof CalculatorForm>(key: K) =>
    (value: CalculatorForm[K]) =>
      update(key, value);

  const result = useMemo(() => calculateBill(toBillInput(form)), [form]);
  const tariff = selectTariff(form.billMonth);
  const months = periodMonths(form);
  const guide = useMemo(
    () =>
      tariff && result.units
        ? slabGuide(
            tariff,
            months,
            form.phase,
            result.units.value,
            form.subsidyEligible,
          )
        : null,
    [tariff, months, form.phase, form.subsidyEligible, result.units],
  );
  const publishedRate = lookupFuelRate(form.billMonth);
  const statusId = useId();
  const billRef = useRef<HTMLElement>(null);
  const billInView = useInView(billRef);
  const specialId = useId();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 pb-28 sm:px-6 lg:pb-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            KSEB bill calculator
          </h1>
          <p className="text-sm text-muted-foreground">
            Household (LT-I Domestic) electricity bills
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
          <ModeToggle />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardContent className="flex flex-col gap-8">
            <FieldSet>
              <FieldLegend>Connection</FieldLegend>
              <div className="flex flex-wrap gap-3">
                <Segmented
                  label="Phase"
                  value={form.phase}
                  onChange={set('phase')}
                  options={[
                    { value: 'single', label: 'Single phase' },
                    { value: 'three', label: 'Three phase' },
                  ]}
                />
                <Segmented
                  label="Billing cycle"
                  value={form.billingFrequency}
                  onChange={set('billingFrequency')}
                  options={[
                    { value: 'bimonthly', label: 'Every 2 months' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
              </div>
              <Field orientation="horizontal">
                <Switch
                  id="subsidy"
                  checked={form.subsidyEligible}
                  onCheckedChange={set('subsidyEligible')}
                />
                <FieldLabel htmlFor="subsidy">
                  Government subsidy
                  <Info label="About the subsidy">
                    Applies only up to {120 * months} units per bill. Above
                    that, no subsidy at all.
                  </Info>
                </FieldLabel>
              </Field>
              <More label="More options">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Connected load (W)"
                    value={form.connectedLoadWatts}
                    onChange={set('connectedLoadWatts')}
                  />
                  <NumberField
                    label="Meter factor"
                    value={form.omf}
                    onChange={set('omf')}
                    info="Printed on your bill as OMF. Almost always 1."
                  />
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor={specialId}>Special tariff</FieldLabel>
                    <NativeSelect
                      id={specialId}
                      value={form.specialProfile}
                      onChange={(e) =>
                        update(
                          'specialProfile',
                          e.target.value as SpecialProfile,
                        )
                      }
                    >
                      {specialProfiles.map((p) => (
                        <NativeSelectOption key={p.value} value={p.value}>
                          {p.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  {form.specialProfile !== 'none' && (
                    <Alert className="sm:col-span-2">
                      <InfoIcon />
                      <AlertDescription>
                        Not supported yet. Switch to None for the standard
                        tariff.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </More>
            </FieldSet>

            <Separator />

            <FieldSet>
              <FieldLegend>Meter reading</FieldLegend>
              <Field>
                <FieldLabel htmlFor={statusId}>Meter status</FieldLabel>
                <NativeSelect
                  id={statusId}
                  value={form.meterStatus}
                  onChange={(e) =>
                    update('meterStatus', e.target.value as MeterStatus)
                  }
                >
                  {meterStatuses.map((s) => (
                    <NativeSelectOption key={s.value} value={s.value}>
                      {s.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              {form.meterStatus === 'working' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Previous reading"
                    value={form.initialReading}
                    onChange={set('initialReading')}
                  />
                  <NumberField
                    label="Current reading"
                    value={form.finalReading}
                    onChange={set('finalReading')}
                    description={
                      result.units?.source === 'actual'
                        ? `${formatUnits(result.units.value)} units used`
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    label="Assessed units"
                    value={form.assessedUnits}
                    onChange={set('assessedUnits')}
                    info="The units KSEB billed you for, shown on the bill."
                  />
                  <NumberField
                    label="Or monthly average"
                    value={form.averageMonthlyConsumption}
                    onChange={set('averageMonthlyConsumption')}
                    description={
                      months === 2 ? 'Doubled for a 2-month bill' : undefined
                    }
                  />
                </div>
              )}
            </FieldSet>

            <Separator />

            <FieldSet>
              <FieldLegend>Bill month</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="bill-month">Month</FieldLabel>
                  <Input
                    id="bill-month"
                    type="month"
                    value={form.billMonth}
                    onChange={(e) => update('billMonth', e.target.value)}
                  />
                </Field>
                <NumberField
                  label="Fuel surcharge (₹/unit)"
                  value={form.fuelSurchargeRate}
                  onChange={set('fuelSurchargeRate')}
                  placeholder={publishedRate ?? 'e.g. 0.05'}
                  info="Changes every billing period. A negative rate is a refund."
                  description={
                    publishedRate !== null
                      ? `${monthName(form.billMonth)} rate: ${formatMoney(Number(publishedRate))}`
                      : 'Copy it from your bill'
                  }
                />
              </div>
            </FieldSet>

            <More label="Arrears, payments and other charges">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Arrears"
                  value={form.arrears}
                  onChange={set('arrears')}
                />
                <NumberField
                  label="Payments made"
                  value={form.paymentsApplied}
                  onChange={set('paymentsApplied')}
                />
                <NumberField
                  label="Advance"
                  value={form.advanceApplied}
                  onChange={set('advanceApplied')}
                />
                <NumberField
                  label="Credits"
                  value={form.accountCredits}
                  onChange={set('accountCredits')}
                  info="Refunds or deposit interest credited to your account."
                />
                <NumberField
                  label="Late surcharge"
                  value={form.surcharge}
                  onChange={set('surcharge')}
                />
                <NumberField
                  label="Reconnection fee"
                  value={form.reconnectionFee}
                  onChange={set('reconnectionFee')}
                />
                <NumberField
                  label="Interim bills"
                  value={form.interimBills}
                  onChange={set('interimBills')}
                />
                <NumberField
                  label="Meter rent"
                  value={form.meterRent}
                  onChange={set('meterRent')}
                />
                <NumberField
                  label="Other charges"
                  value={form.otherCharges}
                  onChange={set('otherCharges')}
                />
              </div>
            </More>
          </CardContent>
        </Card>

        <section id="bill" ref={billRef} aria-label="Bill">
          <BillSummary result={result} guide={guide} />
        </section>
      </div>

      {result.lines.length > 0 && !billInView && (
        <a
          href="#bill"
          className="fixed inset-x-4 bottom-4 flex items-center justify-between rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg lg:hidden"
        >
          <span className="text-sm">Bill total</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatRupees(result.billTotal)}
          </span>
        </a>
      )}
    </div>
  );
}
