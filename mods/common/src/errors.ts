export class OutLastError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'OutLastError';
    Object.setPrototypeOf(this, OutLastError.prototype);
  }
}

export class ValidationError extends OutLastError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends OutLastError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 'NOT_FOUND', { resource, identifier });
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ChannelError extends OutLastError {
  constructor(
    channel: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(`Channel ${channel} error: ${message}`, 'CHANNEL_ERROR', { channel, ...details });
    this.name = 'ChannelError';
    Object.setPrototypeOf(this, ChannelError.prototype);
  }
}

