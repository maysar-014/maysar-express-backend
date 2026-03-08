import { initEventBusAuditMiddleware } from './eventBusAudit';

describe('eventBusAudit compatibility shim', () => {
  it('is a safe no-op for backward compatibility', () => {
    expect(() => initEventBusAuditMiddleware()).not.toThrow();
    expect(initEventBusAuditMiddleware()).toBeUndefined();
  });
});
