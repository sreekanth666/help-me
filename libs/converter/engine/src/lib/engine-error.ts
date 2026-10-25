import type { ErrorCode } from './protocol';

export class EngineError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
