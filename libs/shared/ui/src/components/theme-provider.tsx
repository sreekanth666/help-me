'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * Wraps every Help Me micro-frontend so light/dark mode is resolved
 * identically across the suite. Apps mount this once in their root layout
 * and never configure theming themselves.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
