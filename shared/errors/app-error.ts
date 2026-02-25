export class AppError extends Error {
  public readonly metadata?: Record<string, any>;
  public readonly statusCode?: number;

  constructor(message: string, metadata?: Record<string, any>, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.metadata = metadata;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}
