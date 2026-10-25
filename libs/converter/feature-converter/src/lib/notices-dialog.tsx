'use client';

import { Button } from '@helpme/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@helpme/ui/components/ui/dialog';
import { useState } from 'react';

const CREDITS = [
  ['mediabunny', 'MPL-2.0', 'Reading and writing MP4 and WebM, and encoding through WebCodecs.', 'https://github.com/Vanilagy/mediabunny'],
  ['@mediabunny/aac-encoder', 'MPL-2.0', 'AAC audio for MP4 where the browser has no encoder. Built on FFmpeg’s native AAC encoder (LGPL-2.1-or-later).', 'https://github.com/Vanilagy/mediabunny'],
  ['@jsquash/webp', 'Apache-2.0', 'WebP encoding for lossless output and browsers without native WebP encoding. Uses libwebp (BSD-3-Clause).', 'https://github.com/jamsinclair/jSquash'],
  ['client-zip', 'MIT', 'Building the ZIP download.', 'https://github.com/Touffy/client-zip'],
] as const;

export function NoticesDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Open-source credits
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open-source credits</DialogTitle>
            <DialogDescription>
              Conversion runs entirely in your browser using these libraries.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-3 text-sm">
            {CREDITS.map(([name, licence, note, href]) => (
              <li key={name}>
                <a className="font-medium underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">
                  {name}
                </a>{' '}
                <span className="text-muted-foreground">({licence})</span>
                <p className="text-muted-foreground">{note}</p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
