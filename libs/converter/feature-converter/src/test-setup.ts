// Adds DOM matchers (toBeInTheDocument, toHaveClass, ...) to Vitest's expect.
import '@testing-library/jest-dom/vitest';

// jsdom has none of these; stub only what the feature touches.
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:stub';
  URL.revokeObjectURL = () => undefined;
}

class ResizeObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
