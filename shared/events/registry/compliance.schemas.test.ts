import { eventRegistry } from './base';
import { KYCStatusChangedSchema, registerComplianceSchemas } from './compliance.schemas';

describe('compliance schemas', () => {
  beforeEach(() => {
    ((eventRegistry as unknown) as { schemas: Map<string, unknown> }).schemas.clear();
  });

  it('validates KYC status changed payload', () => {
    expect(KYCStatusChangedSchema.validate({ userId: 'u1', newStatus: 'approved' }).valid).toBe(true);
    expect(KYCStatusChangedSchema.validate({ userId: 'u1' })).toEqual({
      valid: false,
      errors: ['newStatus is required']
    });
  });

  it('registers compliance schema', () => {
    registerComplianceSchemas();
    expect(eventRegistry.getSchema('KYCStatusChanged')).toBeDefined();
  });
});
