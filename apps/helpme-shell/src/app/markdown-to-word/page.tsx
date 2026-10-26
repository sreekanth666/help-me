import type { Metadata } from 'next';

import { MarkdownToWord } from '@helpme/markdown-feature-markdown-to-word';

export const metadata: Metadata = {
  title: 'Markdown to Word · Help Me',
  description:
    'Paste Markdown and copy it as formatted text that pastes cleanly into Word.',
};

export default function MarkdownToWordPage() {
  return (
    <main>
      <MarkdownToWord />
    </main>
  );
}
