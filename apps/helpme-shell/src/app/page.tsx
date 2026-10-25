import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { ModeToggle } from '@helpme/ui/components/mode-toggle';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@helpme/ui/components/ui/card';

import { apps } from './apps';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Help Me</h1>
          <p className="text-muted-foreground mt-1">
            A digital toolkit for the things you keep meaning to sort out.
          </p>
        </div>
        <ModeToggle />
      </header>

      <section aria-labelledby="apps-heading" className="flex flex-col gap-4">
        <h2 id="apps-heading" className="text-muted-foreground text-sm font-medium">
          Tools
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <li key={app.href}>
              <Link
                href={app.href}
                className="focus-visible:ring-ring block rounded-4xl outline-none focus-visible:ring-2"
              >
                <Card className="hover:bg-accent h-full transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      {app.name}
                      <ArrowUpRightIcon
                        aria-hidden
                        className="text-muted-foreground size-4"
                      />
                    </CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
