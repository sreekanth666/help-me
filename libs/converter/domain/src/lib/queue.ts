export type ItemStatus =
  | 'probing'
  | 'ready'
  | 'queued'
  | 'running'
  | 'done'
  | 'error'
  | 'canceled';

export interface ItemResult {
  name: string;
  bytes: number;
  mime: string;
  ms: number;
}

export interface QueueItem {
  id: string;
  name: string;
  sizeBytes: number;
  status: ItemStatus;
  /** 0-1, meaningful while running. */
  progress: number;
  error: string | null;
  result: ItemResult | null;
}

export interface QueueState {
  items: QueueItem[];
}

export type QueueAction =
  | { type: 'add'; items: { id: string; name: string; sizeBytes: number }[] }
  | { type: 'probed'; id: string }
  | { type: 'enqueue'; id?: string }
  | { type: 'start'; id: string }
  | { type: 'progress'; id: string; ratio: number }
  | { type: 'done'; id: string; result: ItemResult }
  | { type: 'fail'; id: string; message: string }
  | { type: 'cancel'; id: string }
  | { type: 'retry'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'clear' };

export const initialQueue: QueueState = { items: [] };

const LIVE: ItemStatus[] = ['probing', 'ready', 'queued', 'running'];

function update(
  state: QueueState,
  id: string,
  from: ItemStatus[],
  change: (item: QueueItem) => Partial<QueueItem>,
): QueueState {
  const target = state.items.find((i) => i.id === id);
  if (!target || !from.includes(target.status)) return state;
  return {
    items: state.items.map((i) => (i.id === id ? { ...i, ...change(i) } : i)),
  };
}

/** State transitions only move forward; a late message for a finished item changes nothing. */
export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'add':
      return {
        items: [
          ...state.items,
          ...action.items.map(
            (i): QueueItem => ({ ...i, status: 'probing', progress: 0, error: null, result: null }),
          ),
        ],
      };
    case 'probed':
      return update(state, action.id, ['probing'], () => ({ status: 'ready' }));
    case 'enqueue':
      return {
        items: state.items.map((i) =>
          i.status === 'ready' && (action.id === undefined || action.id === i.id)
            ? { ...i, status: 'queued' }
            : i,
        ),
      };
    case 'start':
      return update(state, action.id, ['queued'], () => ({ status: 'running', progress: 0 }));
    case 'progress':
      return update(state, action.id, ['running'], () => ({
        progress: Math.min(1, Math.max(0, action.ratio)),
      }));
    case 'done':
      return update(state, action.id, ['running'], () => ({
        status: 'done',
        progress: 1,
        result: action.result,
      }));
    case 'fail':
      return update(state, action.id, ['probing', 'queued', 'running'], () => ({
        status: 'error',
        error: action.message,
      }));
    case 'cancel':
      return update(state, action.id, LIVE, () => ({ status: 'canceled' }));
    case 'retry':
      return update(state, action.id, ['error', 'canceled'], () => ({
        status: 'ready',
        error: null,
        progress: 0,
        result: null,
      }));
    case 'remove':
      return { items: state.items.filter((i) => i.id !== action.id) };
    case 'clear':
      return initialQueue;
  }
}

/** The next job to run, or null if one is already running or none is waiting. */
export function nextRunnable(state: QueueState): QueueItem | null {
  if (state.items.some((i) => i.status === 'running')) return null;
  return state.items.find((i) => i.status === 'queued') ?? null;
}
