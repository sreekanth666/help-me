'use client';

import { Button } from '@helpme/ui/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@helpme/ui/components/ui/empty';
import { cn } from '@helpme/ui/lib/utils';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const ACCEPT = 'image/png,image/jpeg,image/webp,video/mp4,video/webm';

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

/** Drop target, file picker and paste handler in one. Wraps no state beyond the drag highlight. */
export function Dropzone({ onFiles, compact }: DropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length > 0) onFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFiles]);

  return (
    <div
      data-testid="dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) onFiles(files);
      }}
      className={cn(
        'rounded-3xl border-2 border-dashed transition-colors',
        over ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <Empty className={compact ? 'py-6' : undefined}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Upload />
          </EmptyMedia>
          <EmptyTitle>Drop files here</EmptyTitle>
          <EmptyDescription>
            PNG, JPEG and WebP images, MP4 and WebM videos. You can also paste an image.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={() => input.current?.click()}>
          Choose files
        </Button>
        <input
          ref={input}
          data-testid="file-input"
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onFiles(files);
            e.target.value = '';
          }}
        />
      </Empty>
    </div>
  );
}
