import { isErrorLike, normalizeLogMeta, serializeError, serializeLogValue } from './error-utils';

describe('error-utils', () => {
  it('serializes errors, strings, and plain values consistently', () => {
    const error = Object.assign(new Error('boom'), { code: 'E_BANG', cause: new Error('root') });

    const serialized = serializeError(error);

    expect(serialized).toEqual(expect.objectContaining({
      name: 'Error',
      message: 'boom',
      code: 'E_BANG',
      cause: expect.objectContaining({
        message: 'root'
      })
    }));
    expect(isErrorLike(error)).toBe(true);
    expect(isErrorLike({ message: 'x', stack: 'stack' })).toBe(true);
    expect(isErrorLike({ message: 'x' })).toBe(false);
    expect(serializeError('plain')).toEqual({ name: 'Error', message: 'plain' });
    expect(serializeLogValue([error, 'ok'])).toEqual([
      expect.objectContaining({ message: 'boom' }),
      'ok'
    ]);
  });

  it('normalizes nested error metadata without mutating plain fields', () => {
    const meta = normalizeLogMeta({
      requestId: 'req-1',
      error: new Error('network'),
      reason: { message: 'validation', stack: 'stack' },
      cause: 'bad-input'
    });

    expect(meta).toEqual(expect.objectContaining({
      requestId: 'req-1',
      error: expect.objectContaining({ message: 'network' }),
      reason: expect.objectContaining({ message: 'validation' }),
      cause: 'bad-input'
    }));
  });
});
