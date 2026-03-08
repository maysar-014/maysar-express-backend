import { v4 as uuidv4 } from 'uuid';
import { createEventMetadata, metadataToHeaders } from './metadata';

jest.mock('uuid', () => ({
  v4: jest.fn()
}));

describe('event metadata helpers', () => {
  const mockedUuid = uuidv4 as jest.MockedFunction<typeof uuidv4>;

  beforeEach(() => {
    mockedUuid.mockReset();
  });

  it('creates metadata with generated ids and default version', () => {
    mockedUuid.mockReturnValueOnce('generated-correlation').mockReturnValueOnce('generated-request');

    const metadata = createEventMetadata('auth-service');

    expect(metadata).toMatchObject({
      correlationId: 'generated-correlation',
      requestId: 'generated-request',
      source: 'auth-service',
      version: 'v1'
    });
    expect(typeof metadata.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(metadata.timestamp))).toBe(false);
  });

  it('respects context overrides while still generating request id', () => {
    mockedUuid.mockReturnValueOnce('generated-request');

    const metadata = createEventMetadata('order-service', {
      correlationId: 'corr-123',
      userId: 'user-42',
      version: 'v2',
      idempotencyKey: 'idem-9'
    });

    expect(metadata).toEqual(
      expect.objectContaining({
        correlationId: 'corr-123',
        requestId: 'generated-request',
        userId: 'user-42',
        source: 'order-service',
        version: 'v2',
        idempotencyKey: 'idem-9'
      })
    );
  });

  it('maps metadata to standard headers and includes user header only when provided', () => {
    const headersWithUser = metadataToHeaders({
      correlationId: 'corr-x',
      requestId: 'req-x',
      userId: 'user-x',
      source: 'catalog-service',
      timestamp: '2026-03-07T12:00:00.000Z',
      version: 'v1'
    });
    const headersWithoutUser = metadataToHeaders({
      correlationId: 'corr-y',
      requestId: 'req-y',
      source: 'catalog-service',
      timestamp: '2026-03-07T12:00:00.000Z',
      version: 'v1'
    });

    expect(headersWithUser).toEqual({
      'X-Correlation-ID': 'corr-x',
      'X-Request-ID': 'req-x',
      'X-User-ID': 'user-x',
      source: 'catalog-service',
      version: 'v1',
      timestamp: '2026-03-07T12:00:00.000Z'
    });
    expect(headersWithoutUser).toEqual({
      'X-Correlation-ID': 'corr-y',
      'X-Request-ID': 'req-y',
      source: 'catalog-service',
      version: 'v1',
      timestamp: '2026-03-07T12:00:00.000Z'
    });
    expect(headersWithoutUser['X-User-ID']).toBeUndefined();
  });
});
