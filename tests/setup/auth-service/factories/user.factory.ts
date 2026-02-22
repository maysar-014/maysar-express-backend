import { v4 as uuidv4 } from 'uuid';

export interface UserFactoryProps {
  id?: string;
  email?: string;
  role?: string;
  status?: string;
  profile?: any;
  kycStatus?: string;
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserFactory {
  static create(overrides: UserFactoryProps = {}) {
    const now = new Date();
    
    return {
      id: overrides.id ?? uuidv4(),
      email: overrides.email ?? `user-${Date.now()}@example.com`,
      role: overrides.role ?? 'buyer',
      status: overrides.status ?? 'ACTIVE',
      profile: overrides.profile ?? {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+255712345678'
      },
      kycStatus: overrides.kycStatus ?? 'APPROVED',
      failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
      lockoutUntil: overrides.lockoutUntil ?? null,
      twoFactorEnabled: overrides.twoFactorEnabled ?? false,
      twoFactorSecret: overrides.twoFactorSecret ?? null,
      emailVerified: overrides.emailVerified ?? true,
      phoneVerified: overrides.phoneVerified ?? false,
      lastLoginAt: overrides.lastLoginAt ?? null,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now
    };
  }

  static createBuyer(overrides: UserFactoryProps = {}) {
    return this.create({ ...overrides, role: 'buyer' });
  }

  static createSeller(overrides: UserFactoryProps = {}) {
    return this.create({ ...overrides, role: 'seller' });
  }

  static createEnabler(overrides: UserFactoryProps = {}) {
    return this.create({ ...overrides, role: 'enabler' });
  }

  static createSystem(overrides: UserFactoryProps = {}) {
    return this.create({ ...overrides, role: 'system' });
  }

  static createSuspended(overrides: UserFactoryProps = {}) {
    return this.create({ ...overrides, status: 'SUSPENDED' });
  }

  static createLocked(overrides: UserFactoryProps = {}) {
    return this.create({
      ...overrides,
      failedLoginAttempts: 5,
      lockoutUntil: new Date(Date.now() + 1800000) // 30 minutes from now
    });
  }

  static createWith2FA(overrides: UserFactoryProps = {}) {
    return this.create({
      ...overrides,
      twoFactorEnabled: true,
      twoFactorSecret: 'JBSWY3DPEHPK3PXP'
    });
  }

  static createUnverified(overrides: UserFactoryProps = {}) {
    return this.create({
      ...overrides,
      emailVerified: false,
      kycStatus: 'PENDING'
    });
  }
}
