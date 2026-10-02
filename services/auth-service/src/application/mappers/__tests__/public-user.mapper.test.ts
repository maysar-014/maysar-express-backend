import { toPublicUser } from '../user.mapper';
import type { AuthUser } from '../../../domain/entities/user.types';

/**
 * Regression guard for the login-response credential leak.
 *
 * `res.json()` serializes own properties, and the Prisma repository attaches
 * `passwordHash` / `twoFactorSecret` to the entity it returns - so returning the
 * entity from the login use-case shipped the bcrypt hash to every client that
 * logged in. The response must be built from an explicit allow-list instead.
 */
describe('toPublicUser', () => {
  const entity = {
    id: 'usr_01ABC',
    publicCode: 'USR-0001',
    email: 'buyer@maysar.co.tz',
    role: 'buyer',
    status: 'active',
    isEmailVerified: true,
    isPhoneVerified: true,
    twoFactorEnabled: true,
    failedLoginAttempts: 0,
    lastLoginAt: new Date('2026-09-28T00:00:00.000Z'),
    createdAt: new Date('2026-08-21T21:19:45.334Z'),
    updatedAt: new Date('2026-09-27T01:32:31.699Z'),
    metadata: { roles: ['buyer'] },
    // Sensitive fields the repository attaches to the entity:
    passwordHash: { hash: '$2b$12$7ywW5QZvWKq0TztwGMXtl.Oh80pqexll1obwHhjoEyHrk6cJoxTGK' },
    twoFactorSecret: 'JBSWY3DPEHPK3PXP',
  } as unknown as AuthUser & { passwordHash?: unknown; twoFactorSecret?: unknown };

  it('never exposes the password hash or the 2FA secret', () => {
    const publicUser = toPublicUser(entity);

    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(publicUser).not.toHaveProperty('twoFactorSecret');
    expect(JSON.stringify(publicUser)).not.toContain('$2b$12$');
    expect(JSON.stringify(publicUser)).not.toContain('JBSWY3DPEHPK3PXP');
  });

  it('preserves the client-facing contract', () => {
    const publicUser = toPublicUser(entity);

    expect(publicUser.id).toBe('usr_01ABC');
    expect(publicUser.email).toBe('buyer@maysar.co.tz');
    expect(publicUser.role).toBe('buyer');
    expect(publicUser.status).toBe('active');
    expect(publicUser.isEmailVerified).toBe(true);
    expect(publicUser.twoFactorEnabled).toBe(true);
    expect(publicUser.metadata).toEqual({ roles: ['buyer'] });
    expect(publicUser.createdAt).toBeInstanceOf(Date);
  });

  it('drops any field that is not on the allow-list', () => {
    const withExtra = { ...entity, secretInternalNote: 'do-not-leak' };

    expect(toPublicUser(withExtra)).not.toHaveProperty('secretInternalNote');
  });
});