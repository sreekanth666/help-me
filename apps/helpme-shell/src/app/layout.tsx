import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ThemeProvider } from '@helpme/ui/components/theme-provider';
import { Toaster } from '@helpme/ui/components/ui/sonner';
import { TooltipProvider } from '@helpme/ui/components/ui/tooltip';

import './global.css';

// The design system maps its font tokens onto these variables, so the shell
// only has to load the files; next/font self-hosts them at build time.
const fontSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontMono.variable} antialiased`}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
