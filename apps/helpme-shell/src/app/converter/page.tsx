import type { Metadata } from 'next';

import { MediaConverter } from '@helpme/converter-feature-converter';

export const metadata: Metadata = {
  title: 'Media Converter · Help Me',
  description:
    'Convert PNG, JPEG, WebP, MP4 and WebM files in your browser. Nothing is uploaded.',
};

export default function ConverterPage() {
  return (
    <main>
      <MediaConverter />
    </main>
  );
}
