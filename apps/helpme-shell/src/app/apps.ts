/**
 * Registry of the tools served by the shell. Each entry is a route under the
 * same domain; add a line here when a new app's page lands in `src/app`.
 */
export interface AppEntry {
  href: string;
  name: string;
  description: string;
}

export const apps: AppEntry[] = [
  {
    href: '/kseb',
    name: 'KSEB Bill Calculator',
    description: 'Work out a KSEB household electricity bill, line by line.',
  },
];
