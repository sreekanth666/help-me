'use client';

import { useState } from 'react';
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';

import type { BillLine, BillResult, SlabGuide } from '@helpme/kseb-domain';
import { Alert, AlertDescription } from '@helpme/ui/components/ui/alert';
import { Badge } from '@helpme/ui/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@helpme/ui/components/ui/card';
import { Label } from '@helpme/ui/components/ui/label';
import { Separator } from '@helpme/ui/components/ui/separator';
import { Switch } from '@helpme/ui/components/ui/switch';
import { cn } from '@helpme/ui/lib/utils';

import { formatMoney, formatRupees, formatUnits } from './format';
import { SlabMeter } from './slab-meter';

const statusBadge: Record<
  BillResult['status'],
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  exact: { label: 'Exact', variant: 'default' },
  estimate: { label: 'Estimate', variant: 'secondary' },
  incomplete: { label: 'Incomplete', variant: 'outline' },
  unsupported: { label: 'Not supported', variant: 'destructive' },
};

function Lines({
  lines,
  showWorking,
}: {
  lines: BillLine<string>[];
  showWorking: boolean;
}) {
  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      {lines.map((l) => (
        <div key={l.key} className="grid grid-cols-[1fr_auto] gap-x-4">
          <dt className={cn(l.amount < 0 && 'text-muted-foreground')}>
            {l.label}
          </dt>
          <dd
            className={cn(
              'text-right tabular-nums',
              l.amount < 0 && 'text-muted-foreground',
            )}
          >
            {formatMoney(l.amount)}
          </dd>
          {showWorking && l.formula && (
            <dd className="col-span-2 text-xs text-muted-foreground tabular-nums">
              {l.formula}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

export function BillSummary({
  result,
  guide,
}: {
  result: BillResult;
  guide: SlabGuide | null;
}) {
  const [showWorking, setShowWorking] = useState(false);
  const badge = statusBadge[result.status];
  const priced = result.lines.length > 0;
  const { settlement } = result;

  return (
    <Card aria-labelledby="bill-total-label" className="lg:sticky lg:top-6">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex w-full items-center justify-between gap-2">
          <span id="bill-total-label" className="text-sm text-muted-foreground">
            Bill total
          </span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <output
          aria-live="polite"
          data-testid="bill-total"
          className={cn(
            'text-5xl font-semibold tracking-tight tabular-nums',
            !priced && 'text-muted-foreground/50',
          )}
        >
          {priced ? formatRupees(result.billTotal) : '₹—'}
        </output>
        {result.units && (
          <div className="flex items-center gap-2 text-sm">
            <span className="tabular-nums">
              {formatUnits(result.units.value)} units
            </span>
            <Badge variant="outline">
              {result.units.source === 'actual' ? 'Actual reading' : 'Assessed'}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {guide && result.units && (
          <SlabMeter guide={guide} units={result.units.value} />
        )}

        {result.issues.map((issue) => (
          <Alert
            key={issue.code}
            variant={issue.severity === 'error' ? 'destructive' : 'default'}
          >
            {issue.severity === 'error' ? (
              <CircleAlertIcon />
            ) : (
              <TriangleAlertIcon />
            )}
            <AlertDescription>{issue.message}</AlertDescription>
          </Alert>
        ))}

        {priced && (
          <>
            <Separator />
            <Lines lines={result.lines} showWorking={showWorking} />
            <div className="flex items-center gap-2">
              <Switch
                id="show-working"
                size="sm"
                checked={showWorking}
                onCheckedChange={setShowWorking}
              />
              <Label htmlFor="show-working" className="text-muted-foreground">
                Show working
              </Label>
            </div>
          </>
        )}
      </CardContent>

      {priced && settlement.lines.length > 0 && (
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Lines
            lines={[
              {
                key: 'bill',
                label: 'Bill total',
                amount: result.billTotal,
                formula: '',
              },
              ...settlement.lines,
            ]}
            showWorking={false}
          />
          <Separator />
          <div className="flex items-baseline justify-between">
            <span className="font-medium">Net payable</span>
            <span
              data-testid="net-payable"
              className="text-2xl font-semibold tabular-nums"
            >
              {formatMoney(settlement.netPayable)}
            </span>
          </div>
        </CardFooter>
      )}

      {result.tariffVersion && (
        <CardFooter className="text-xs text-muted-foreground">
          {result.tariffVersion}
        </CardFooter>
      )}
    </Card>
  );
}
