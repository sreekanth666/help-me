import { initialQueue, nextRunnable, queueReducer, type QueueState } from './queue';

const added = (): QueueState =>
  queueReducer(initialQueue, {
    type: 'add',
    items: [
      { id: 'a', name: 'a.png', sizeBytes: 1000 },
      { id: 'b', name: 'b.webm', sizeBytes: 5000 },
    ],
  });

/** Item `a` taken through the real flow: probed, enqueued, started. */
const runningA = (): QueueState => {
  let s = queueReducer(added(), { type: 'probed', id: 'a' });
  s = queueReducer(s, { type: 'enqueue' });
  return queueReducer(s, { type: 'start', id: 'a' });
};

const status = (s: QueueState, id: string) => s.items.find((i) => i.id === id)?.status;

describe('queueReducer', () => {
  it('adds items as probing, in order', () => {
    const s = added();
    expect(s.items.map((i) => [i.id, i.status])).toEqual([['a', 'probing'], ['b', 'probing']]);
  });

  it('moves a probed item to ready', () => {
    expect(status(queueReducer(added(), { type: 'probed', id: 'a' }), 'a')).toBe('ready');
  });

  it('enqueue marks only ready items as queued', () => {
    let s = queueReducer(added(), { type: 'probed', id: 'a' });
    s = queueReducer(s, { type: 'enqueue' });
    expect(status(s, 'a')).toBe('queued');
    expect(status(s, 'b')).toBe('probing');
  });

  it('runs one job at a time, oldest first', () => {
    let s = queueReducer(queueReducer(added(), { type: 'probed', id: 'a' }), { type: 'probed', id: 'b' });
    s = queueReducer(s, { type: 'enqueue' });
    expect(nextRunnable(s)?.id).toBe('a');
    s = queueReducer(s, { type: 'start', id: 'a' });
    expect(nextRunnable(s)).toBeNull();
    s = queueReducer(s, { type: 'done', id: 'a', result: { name: 'a.webp', bytes: 400, mime: 'image/webp', ms: 30 } });
    expect(nextRunnable(s)?.id).toBe('b');
  });

  it('records progress as a ratio, clamped to 0-1', () => {
    let s = runningA();
    s = queueReducer(s, { type: 'progress', id: 'a', ratio: 1.7 });
    expect(s.items[0].progress).toBe(1);
  });

  it('keeps the result on done and resets progress for a retry', () => {
    let s = runningA();
    s = queueReducer(s, { type: 'done', id: 'a', result: { name: 'a.webp', bytes: 400, mime: 'image/webp', ms: 30 } });
    expect(s.items[0]).toMatchObject({ status: 'done', progress: 1, result: { bytes: 400 } });
  });

  it('records an error message and lets the item be retried as ready', () => {
    let s = runningA();
    s = queueReducer(s, { type: 'fail', id: 'a', message: 'boom' });
    expect(s.items[0]).toMatchObject({ status: 'error', error: 'boom' });
    s = queueReducer(s, { type: 'retry', id: 'a' });
    expect(s.items[0]).toMatchObject({ status: 'ready', error: null, progress: 0 });
  });

  it('cancels a queued item without disturbing others', () => {
    let s = queueReducer(queueReducer(added(), { type: 'probed', id: 'a' }), { type: 'probed', id: 'b' });
    s = queueReducer(s, { type: 'enqueue' });
    s = queueReducer(s, { type: 'cancel', id: 'a' });
    expect(status(s, 'a')).toBe('canceled');
    expect(status(s, 'b')).toBe('queued');
  });

  it('does not overwrite a finished item with a late cancel or progress', () => {
    let s = runningA();
    s = queueReducer(s, { type: 'done', id: 'a', result: { name: 'a.webp', bytes: 1, mime: 'image/webp', ms: 1 } });
    s = queueReducer(s, { type: 'cancel', id: 'a' });
    s = queueReducer(s, { type: 'progress', id: 'a', ratio: 0.2 });
    expect(s.items[0]).toMatchObject({ status: 'done', progress: 1 });
  });

  it('removes one item, and clear empties the queue', () => {
    expect(queueReducer(added(), { type: 'remove', id: 'a' }).items.map((i) => i.id)).toEqual(['b']);
    expect(queueReducer(added(), { type: 'clear' }).items).toEqual([]);
  });

  it('ignores actions for unknown ids', () => {
    const s = added();
    expect(queueReducer(s, { type: 'start', id: 'zzz' })).toEqual(s);
  });
});
