/*
 * @helpme/ui public entry point.
 *
 * Components are deliberately NOT re-exported here. A barrel over 61
 * components would drag the entire library — and every Base UI primitive it
 * depends on — into the client bundle of any app that imported a single
 * button. Import them per file instead, which is also shadcn's own
 * convention:
 *
 *   import { Button } from '@helpme/ui/components/ui/button';
 *   import { ThemeProvider } from '@helpme/ui/components/theme-provider';
 *
 * Only server-safe, dependency-free helpers belong in this file.
 */

export { cn } from './lib/utils';
