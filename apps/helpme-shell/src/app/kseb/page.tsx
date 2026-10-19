import type { Metadata } from 'next';

import { KsebCalculator } from '@helpme/kseb-feature-calculator';

export const metadata: Metadata = {
  title: 'KSEB Bill Calculator · Help Me',
  description: 'Work out a KSEB household electricity bill, line by line.',
};

export default function KsebPage() {
  return (
    <main>
      <KsebCalculator />
    </main>
  );
}
