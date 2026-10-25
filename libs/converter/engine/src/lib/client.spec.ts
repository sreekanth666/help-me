import type { Capabilities } from '@helpme/converter-domain';
import { createConverterClient, ConverterError, type WorkerLike } from './client';
import type { FromWorker, ToWorker } from './protocol';

const CAPS: Capabilities = {
  webCodecs: true,
  videoEncoders: ['avc'],
  audioEncoders: ['aac'],
  aacViaWasm: false,
  nativeWebpEncode: true,
  fileSystemAccess: false,
  deviceClass: 'desktop',
};

class FakeWorker implements WorkerLike {
  sent: ToWorker[] = [];
  terminated = false;
  onmessage: ((e: { data: FromWorker }) => void) | null = null;
  onerror: ((e: { message?: string }) => void) | null = null;
  postMessage(msg: ToWorker) { this.sent.push(msg); }
  terminate() { this.terminated = true; }
  reply(msg: FromWorker) { this.onmessage?.({ data: msg }); }
  last<T extends ToWorker['type']>(type: T) {
    return [...this.sent].reverse().find((m) => m.type === type) as Extract<ToWorker, { type: T }>;
  }
}

const setup = () => {
  const workers: FakeWorker[] = [];
  const client = createConverterClient({
    createWorker: () => { const w = new FakeWorker(); workers.push(w); return w; },
    cancelGraceMs: 20,
  });
  return { client, workers };
};

const file = new File([new Uint8Array(4)], 'a.png');
const job = { kind: 'image', options: {} } as never;

describe('createConverterClient', () => {
  it('does not start a worker until it is used', () => {
    const { workers } = setup();
    expect(workers).toHaveLength(0);
  });

  it('fetches capabilities once and caches them', async () => {
    const { client, workers } = setup();
    const first = client.capabilities();
    workers[0].reply({ type: 'ready', capabilities: CAPS });
    expect(await first).toEqual(CAPS);
    expect(await client.capabilities()).toEqual(CAPS);
    expect(workers[0].sent.filter((m) => m.type === 'init')).toHaveLength(1);
  });

  it('matches a probe reply to its request by id', async () => {
    const { client, workers } = setup();
    const a = client.probe(file);
    const b = client.probe(file);
    const [idA, idB] = workers[0].sent.filter((m) => m.type === 'probe').map((m) => (m as { id: string }).id);
    workers[0].reply({ type: 'probed', id: idB, result: { kind: 'image', format: 'jpeg', info: { format: 'jpeg', width: 2, height: 2, animated: false } } });
    workers[0].reply({ type: 'probed', id: idA, result: { kind: 'image', format: 'png', info: { format: 'png', width: 1, height: 1, animated: false } } });
    expect((await a).format).toBe('png');
    expect((await b).format).toBe('jpeg');
  });

  it('streams progress and resolves with the result', async () => {
    const { client, workers } = setup();
    const progress: number[] = [];
    const p = client.convert({ file, job, sink: { kind: 'blob' } }, { onProgress: (r) => progress.push(r) });
    const { id } = workers[0].last('convert');
    workers[0].reply({ type: 'progress', id, ratio: 0.5 });
    workers[0].reply({ type: 'done', id, blob: null, bytes: 10, mime: 'image/webp', ms: 5, encoder: 'native' });
    expect(await p).toMatchObject({ bytes: 10, mime: 'image/webp' });
    expect(progress).toEqual([0.5]);
  });

  it('rejects with a coded error from the worker', async () => {
    const { client, workers } = setup();
    const p = client.convert({ file, job, sink: { kind: 'blob' } });
    workers[0].reply({ type: 'error', id: workers[0].last('convert').id, code: 'out-of-memory', message: 'too big' });
    await expect(p).rejects.toMatchObject({ code: 'out-of-memory', message: 'too big' });
    await expect(p).rejects.toBeInstanceOf(ConverterError);
  });

  it('asks the worker to cancel when the signal aborts, and rejects once it confirms', async () => {
    const { client, workers } = setup();
    const ctl = new AbortController();
    const p = client.convert({ file, job, sink: { kind: 'blob' } }, { signal: ctl.signal });
    const { id } = workers[0].last('convert');
    ctl.abort();
    expect(workers[0].last('cancel').id).toBe(id);
    workers[0].reply({ type: 'canceled', id });
    await expect(p).rejects.toMatchObject({ code: 'canceled' });
    expect(workers[0].terminated).toBe(false);
  });

  it('terminates a worker that ignores cancel and starts a fresh one next time', async () => {
    const { client, workers } = setup();
    const ctl = new AbortController();
    const p = client.convert({ file, job, sink: { kind: 'blob' } }, { signal: ctl.signal });
    ctl.abort();
    await expect(p).rejects.toMatchObject({ code: 'canceled' });
    expect(workers[0].terminated).toBe(true);

    void client.probe(file);
    expect(workers).toHaveLength(2);
  });

  it('rejects an already-aborted signal without contacting the worker', async () => {
    const { client, workers } = setup();
    const ctl = new AbortController();
    ctl.abort();
    await expect(client.convert({ file, job, sink: { kind: 'blob' } }, { signal: ctl.signal })).rejects.toMatchObject({ code: 'canceled' });
    expect(workers[0]?.sent.some((m) => m.type === 'convert') ?? false).toBe(false);
  });

  it('fails every pending request if the worker crashes', async () => {
    const { client, workers } = setup();
    const p = client.probe(file);
    workers[0].onerror?.({ message: 'boom' });
    await expect(p).rejects.toMatchObject({ code: 'unknown' });
  });

  it('dispose terminates the worker and rejects what was still waiting', async () => {
    const { client, workers } = setup();
    const p = client.probe(file);
    client.dispose();
    expect(workers[0].terminated).toBe(true);
    await expect(p).rejects.toMatchObject({ code: 'canceled' });
  });
});
