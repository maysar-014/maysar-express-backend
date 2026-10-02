import { User } from '../../domain/entities/user.entity';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object';
import type { AuthUser, UserRole, UserStatus } from '../../domain/entities/user.types';

/**
 * Shape returned to HTTP clients for the authenticated user.
 *
 * SECURITY: never serialize the repository entity directly. The Prisma mapper
 * (`infrastructure/repositories/user-service.repository.ts`) attaches a
 * `passwordHash` value object to the object it returns, and `res.json()`
 * serializes own properties regardless of what the `AuthUser` interface
 * declares - which leaked the bcrypt hash in the login response. Responses are
 * built from this allow-list, so a new sensitive field cannot reach a client
 * without an explicit, reviewable addition here.
 */
export interface PublicUser {
  id: string;
  publicCode?: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
  lastLoginAt?: Date;
  avatar?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project a user entity onto the public response contract.
 *
 * Deliberately an allow-list rather than a denylist: `passwordHash` and
 * `twoFactorSecret` are excluded because they must never leave the process, and
 * any future field is excluded until someone adds it here on purpose.
 */
export function toPublicUser(user: AuthUser & { passwordHash?: unknown; twoFactorSecret?: unknown }): PublicUser {
  return {
    id: user.id,
    publicCode: user.publicCode,
    email: user.email,
    name: user.name,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    twoFactorEnabled: user.twoFactorEnabled,
    failedLoginAttempts: user.failedLoginAttempts,
    lastLoginAt: user.lastLoginAt,
    avatar: user.avatar,
    metadata: user.metadata,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class UserMapper {
    public static toDomain(raw: any): User {
        const passwordHash = typeof raw.passwordHash === 'string' && raw.passwordHash.length > 0 
           ? new PasswordHash(raw.passwordHash) 
           : undefined;

        return User.create({
            id: raw.id,
            publicCode: raw.publicCode ?? undefined,
            email: raw.email,
            role: raw.role,
            status: raw.status || raw.accountStatus, // Map from possible field names
            profile: raw.profile,
            kycStatus: raw.kycStatus,
            ...(passwordHash ? { passwordHash } : {})
        });
    }

    public static toPersistence(user: User): any {
        return {
            id: user.id,
            publicCode: user.publicCode,
            email: user.email,
            role: user.role,
            accountStatus: user.status,
            profile: user.profile,
            kycStatus: user.kycStatus,
            passwordHash: user.passwordHash?.toString()
        };
    }
}
