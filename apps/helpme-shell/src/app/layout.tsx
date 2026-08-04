import type { Metadata } from 'next';

import { ThemeProvider } from '@helpme/ui/components/theme-provider';
import { Toaster } from '@helpme/ui/components/ui/sonner';
import { TooltipProvider } from '@helpme/ui/components/ui/tooltip';

import './global.css';

export const metadata: Metadata = {
  title: 'Help Me',
  description: 'A digital toolkit for the things you keep meaning to sort out.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // next-themes sets the theme class on <html> before paint, which React
    // cannot know about during SSR; suppressHydrationWarning is required.
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
