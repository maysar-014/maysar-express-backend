import type { UserContext } from './user-context';

describe('UserContext type', () => {
  it('supports baseline and extended fields', () => {
    const context: UserContext = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'seller',
      roles: ['seller', 'buyer'],
      permissions: ['orders:read'],
      tenantId: 'tenant-1'
    };

    expect(context.id).toBe('user-1');
    expect(context.roles).toContain('buyer');
    expect(context.tenantId).toBe('tenant-1');
  });
});
