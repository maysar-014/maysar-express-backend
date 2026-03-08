import { ServiceError } from './errors';

describe('ServiceError', () => {
  it('preserves standard Error semantics and custom metadata', () => {
    const error = new ServiceError('AUTH_DENIED', 'Access denied', 'Token expired');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.name).toBe('ServiceError');
    expect(error.code).toBe('AUTH_DENIED');
    expect(error.message).toBe('Access denied');
    expect(error.details).toBe('Token expired');
    expect(Object.getPrototypeOf(error)).toBe(ServiceError.prototype);
  });
});
