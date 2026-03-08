import { AppError } from './app-error';

describe('AppError', () => {
  it('creates a typed application error with metadata and status', () => {
    const error = new AppError('validation failed', { field: 'email' }, 400);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.message).toBe('validation failed');
    expect(error.metadata).toEqual({ field: 'email' });
    expect(error.statusCode).toBe(400);
  });

  it('supports optional metadata and status code', () => {
    const error = new AppError('unexpected failure');

    expect(error.metadata).toBeUndefined();
    expect(error.statusCode).toBeUndefined();
  });
});
