import { eventRegistry } from './base';
import { UserProfileUpdatedSchema, UserRegisteredSchema, registerUserSchemas } from './user.schemas';

describe('user schemas', () => {
  beforeEach(() => {
    ((eventRegistry as unknown) as { schemas: Map<string, unknown> }).schemas.clear();
  });

  it('validates user registered and profile updated payloads', () => {
    expect(UserRegisteredSchema.validate({ userId: 'u1', email: 'a@b.com' }).valid).toBe(true);
    expect(UserRegisteredSchema.validate({ userId: 'u1' })).toEqual({
      valid: false,
      errors: ['email is required']
    });

    expect(UserProfileUpdatedSchema.validate({ userId: 'u1', updates: { name: 'x' } }).valid).toBe(true);
    expect(UserProfileUpdatedSchema.validate({ userId: 'u1' })).toEqual({
      valid: false,
      errors: ['updates are required']
    });
  });

  it('registers user schemas into registry', () => {
    registerUserSchemas();
    expect(eventRegistry.getSchema('UserRegistered')).toBeDefined();
    expect(eventRegistry.getSchema('UserProfileUpdated')).toBeDefined();
  });
});
