export class AppError extends Error {
  public readonly metadata?: Record<string, unknown>;
  public readonly statusCode?: number;

  constructor(message: string, metadata?: Record<string, unknown>, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.metadata = metadata;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
