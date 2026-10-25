'use client';

import {
  buildOutputName,
  buildVideoPlan,
  checkImagePixels,
  initialQueue,
  limitsFor,
  nextRunnable,
  queueReducer,
  type Capabilities,
  type ImageFormat,
  type MediaFormat,
  type Settings,
  type VideoFormat,
  type VideoPlan,
} from '@helpme/converter-domain';
import {
  ConverterError,
  type ConverterClient,
  type ConvertJob,
  type ProbeResult,
} from '@helpme/converter-engine';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { usePersistedSettings } from './use-persisted-settings';

export const EXTENSION: Record<MediaFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  mp4: 'mp4',
  webm: 'webm',
};

/** What each format becomes unless the user picks otherwise. */
const DEFAULT_TARGET: Record<MediaFormat, MediaFormat> = {
  png: 'webp',
  jpeg: 'webp',
  webp: 'png',
  mp4: 'webm',
  webm: 'mp4',
};

export interface ItemMeta {
  file: File;
  probe: ProbeResult | null;
  target: MediaFormat | null;
  /** A file chosen with "Save to file", so the output streams to disk instead of memory. */
  handle: FileSystemFileHandle | null;
}

export interface ItemOutput {
  name: string;
  blob: Blob | null;
  bytes: number;
  mime: string;
  encoder: 'native' | 'wasm';
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function useConverter(client: ConverterClient) {
  const [queue, dispatch] = useReducer(queueReducer, initialQueue);
  const [metas, setMetas] = useState<Record<string, ItemMeta>>({});
  const [outputs, setOutputs] = useState<Record<string, ItemOutput>>({});
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [settings, setSettings] = usePersistedSettings();

  const latest = useRef({ metas, outputs, settings });
  latest.current = { metas, outputs, settings };
  const controllers = useRef(new Map<string, AbortController>());
  const started = useRef(new Set<string>());
  const counter = useRef(0);

  useEffect(() => {
    let live = true;
    client.capabilities().then((c) => live && setCaps(c), () => undefined);
    return () => {
      live = false;
    };
  }, [client]);

  useEffect(() => () => client.dispose(), [client]);

  const patchMeta = useCallback((id: string, patch: Partial<ItemMeta>) => {
    setMetas((m) => (m[id] ? { ...m, [id]: { ...m[id], ...patch } } : m));
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const added = files.map((file) => ({ file, id: `f${++counter.current}` }));
      dispatch({
        type: 'add',
        items: added.map(({ file, id }) => ({ id, name: file.name, sizeBytes: file.size })),
      });
      setMetas((m) => ({
        ...m,
        ...Object.fromEntries(added.map(({ file, id }) => [id, { file, probe: null, target: null, handle: null }])),
      }));
      for (const { file, id } of added) {
        client.probe(file).then(
          (probe) => {
            patchMeta(id, { probe, target: DEFAULT_TARGET[probe.format] });
            dispatch({ type: 'probed', id });
          },
          (error) => dispatch({ type: 'fail', id, message: messageOf(error) }),
        );
      }
    },
    [client, patchMeta],
  );

  /** The video plan for an item under the current settings, or null for images and unprobed files. */
  const planFor = useCallback(
    (id: string): VideoPlan | null => {
      const meta = metas[id];
      if (!caps || meta?.probe?.kind !== 'video' || !meta.target) return null;
      return buildVideoPlan(
        meta.probe.probe,
        { ...settings.video, container: meta.target as VideoFormat },
        caps,
      );
    },
    [metas, caps, settings.video],
  );

  const run = useCallback(
    async (id: string) => {
      const { metas: m, outputs: o, settings: s } = latest.current;
      const meta = m[id];
      try {
        if (!meta?.probe || !meta.target) throw new Error('This file has not been read yet.');
        const c = caps ?? (await client.capabilities());
        let job: ConvertJob;
        if (meta.probe.kind === 'image') {
          job = { kind: 'image', options: { ...s.image, format: meta.target as ImageFormat } };
        } else {
          const plan = buildVideoPlan(meta.probe.probe, { ...s.video, container: meta.target as VideoFormat }, c);
          if (plan.blockers.length > 0) throw new Error(plan.blockers[0].message);
          job = { kind: 'video', plan, probe: meta.probe.probe };
        }

        const controller = new AbortController();
        controllers.current.set(id, controller);
        dispatch({ type: 'start', id });
        const result = await client.convert(
          { file: meta.file, job, sink: meta.handle ? { kind: 'fs', handle: meta.handle } : { kind: 'blob' } },
          { signal: controller.signal, onProgress: (ratio) => dispatch({ type: 'progress', id, ratio }) },
        );
        const taken = new Set(Object.values(o).map((x) => x.name));
        const name = meta.handle?.name ?? buildOutputName(meta.file.name, EXTENSION[meta.target], taken);
        setOutputs((prev) => ({
          ...prev,
          [id]: { name, blob: result.blob, bytes: result.bytes, mime: result.mime, encoder: result.encoder },
        }));
        dispatch({ type: 'done', id, result: { name, bytes: result.bytes, mime: result.mime, ms: result.ms } });
      } catch (error) {
        if (error instanceof ConverterError && error.code === 'canceled') dispatch({ type: 'cancel', id });
        else dispatch({ type: 'fail', id, message: messageOf(error) });
      } finally {
        controllers.current.delete(id);
        started.current.delete(id);
      }
    },
    [caps, client],
  );

  // One job at a time: whenever nothing is running, start the oldest queued item.
  useEffect(() => {
    const next = nextRunnable(queue);
    if (next && !started.current.has(next.id)) {
      started.current.add(next.id);
      void run(next.id);
    }
  }, [queue, run]);

  /** Why an image can't be converted on this device (too many pixels), or null. */
  const imageBlockReason = useCallback(
    (id: string): string | null => {
      const probe = metas[id]?.probe;
      if (probe?.kind !== 'image') return null;
      const check = checkImagePixels(probe.info.width, probe.info.height, limitsFor(caps?.deviceClass ?? 'desktop'));
      return check.ok ? null : check.message;
    },
    [metas, caps],
  );

  const isBlocked = useCallback(
    (id: string) => (planFor(id)?.blockers.length ?? 0) > 0 || imageBlockReason(id) !== null,
    [planFor, imageBlockReason],
  );

  const convertAll = useCallback(() => {
    for (const item of queue.items) {
      if (item.status === 'ready' && !isBlocked(item.id)) dispatch({ type: 'enqueue', id: item.id });
    }
  }, [queue.items, isBlocked]);

  const convertOne = useCallback(
    (id: string, handle?: FileSystemFileHandle) => {
      if (handle) patchMeta(id, { handle });
      dispatch({ type: 'enqueue', id });
    },
    [patchMeta],
  );

  const cancel = useCallback((id: string) => {
    const controller = controllers.current.get(id);
    // A running job reports back as canceled itself; anything else is stopped here.
    if (controller) controller.abort();
    else dispatch({ type: 'cancel', id });
  }, []);

  const retry = useCallback((id: string) => {
    patchMeta(id, { handle: null });
    dispatch({ type: 'retry', id });
    dispatch({ type: 'enqueue', id });
  }, [patchMeta]);

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    dispatch({ type: 'remove', id });
    setMetas(({ [id]: _gone, ...rest }) => rest);
    setOutputs(({ [id]: _gone, ...rest }) => rest);
  }, []);

  const clear = useCallback(() => {
    controllers.current.forEach((c) => c.abort());
    dispatch({ type: 'clear' });
    setMetas({});
    setOutputs({});
  }, []);

  const setTarget = useCallback((id: string, target: MediaFormat) => patchMeta(id, { target }), [patchMeta]);

  const updateSettings = useCallback(
    (change: (s: Settings) => Settings) => setSettings(change),
    [setSettings],
  );

  const heldBytes = useMemo(
    () => Object.values(outputs).reduce((sum, o) => sum + (o.blob ? o.bytes : 0), 0),
    [outputs],
  );

  return {
    queue,
    metas,
    outputs,
    caps,
    settings,
    updateSettings,
    heldBytes,
    planFor,
    imageBlockReason,
    isBlocked,
    addFiles,
    setTarget,
    convertAll,
    convertOne,
    cancel,
    retry,
    remove,
    clear,
  };
}
