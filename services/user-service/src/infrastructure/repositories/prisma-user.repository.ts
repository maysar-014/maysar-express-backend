import { PrismaClient, User_UserRole, User_UserStatus } from '@prisma/client';
import { IUserRepository, UserAddress } from '../../domain/repositories';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { UserPreferences, UserRole as UserMetadataRole, KycStatus } from '../../domain/types/user.types';
import { Email } from '../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
import { logger } from '../services/logger.service';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';

type PrismaUserKycStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

function toPrismaUserKycStatus(value?: string | null): PrismaUserKycStatus {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (normalized === 'NONE') return 'NONE';
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'UNDER_REVIEW') return 'PENDING'; // map legacy value to nearest valid
  if (normalized === 'VERIFIED') return 'VERIFIED';
  if (normalized === 'APPROVED') return 'VERIFIED';    // map legacy value to nearest valid
  if (normalized === 'REJECTED') return 'REJECTED';

  return 'NONE';
}

/**
 * Prisma User Repository Implementation
 * Implements the domain IUserRepository interface using Prisma ORM
 * Handles all persistence operations for User aggregates
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly piiService: PiiEncryptionService
  ) { }

  // ============================================================================
  // CORE USER OPERATIONS
  // ============================================================================

  /**
   * Find a user by their unique ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const userData = await this.tryFindByIdInCurrentSchema(id);
      if (userData) {
        return this.mapToDomainEntity(userData);
      }

      const legacyUserData = await this.tryFindLegacyUserById(id);
      return legacyUserData ? this.mapToDomainEntity(legacyUserData) : null;
    } catch (error) {
      logger.error('Error finding user by ID', { userId: id, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find users by a batch of IDs in a single database query.
   *
   * Only the current-schema (`user_User`) table is queried — legacy
   * `users` records are intentionally skipped for bulk lookups because:
   *   1. The name-resolution use case only needs `fullName`, `publicCode`,
   *      and `role`, all of which are present on `user_User`.
   *   2. The legacy `users` table has no `publicCode` column, so its
   *      records would always produce an empty publicCode anyway.
   *   3. A `$queryRaw` fallback for every missing ID would defeat the
   *      purpose of a single-query batch fetch.
   *
   * If the `user_User` table is missing entirely (dev/CI environments
   * without the migration), the method returns an empty array rather
   * than throwing — the use case then maps every requested ID to `null`.
   */
  async findByIds(ids: string[]): Promise<User[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    try {
      const rows = await this.prisma.user_User.findMany({
        where: { id: { in: ids } },
        include: { addresses: true }
      });

      return rows.map((row: any) => this.mapToDomainEntity(row));
    } catch (error: any) {
      if (this.isMissingCurrentSchemaTable(error)) {
        logger.warn('user_User table missing — findByIds returning empty array', { idsCount: ids.length });
        return [];
      }
      logger.error('Error finding users by IDs', { idsCount: ids.length, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find a user by their email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const index = await this.tryFindByEmailInCurrentSchema(email);
      if (index) {
        return this.findById(index.userId);
      }

      const legacyIndex = await this.tryFindLegacyIndexByEmail(email);
      if (!legacyIndex) {
        const legacyUser = await this.findLegacyUserByEmailScan(email);
        return legacyUser ? this.mapToDomainEntity(legacyUser) : null;
      }

      return this.findById(legacyIndex.userId);
    } catch (error) {
      logger.error('Error finding user by email', { email: 'REDACTED', error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find a user by their phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const index = await this.tryFindByPhoneInCurrentSchema(phoneNumber);
      if (index) {
        return this.findById(index.userId);
      }

      const legacyIndex = await this.tryFindLegacyIndexByPhone(phoneNumber);
      if (!legacyIndex) {
        const legacyUser = await this.findLegacyUserByPhoneScan(phoneNumber);
        return legacyUser ? this.mapToDomainEntity(legacyUser) : null;
      }

      return this.findById(legacyIndex.userId);
    } catch (error) {
      logger.error('Error finding user by phone number', { phoneNumber: 'REDACTED', error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async create(user: User): Promise<User> {
    try {
      const userData = this.mapToPrismaCreateData(user);

      const createdUser = await this.prisma.user_User.create({
        data: userData,
        include: { addresses: true }
      });

      await this.prisma.user_UserIndex.createMany({
        data: [
          { userId: createdUser.id, indexType: 'email', value: this.piiService.hash(user.email.value) },
          ...(user.phoneNumber?.value ? [{ userId: createdUser.id, indexType: 'phone', value: this.piiService.hash(user.phoneNumber.value) }] : [])
        ]
      });

      logger.info('User created successfully', { userId: createdUser.id });
      return this.mapToDomainEntity(createdUser);
    } catch (error) {
      logger.error('Error creating user', { userId: user.id, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  async update(user: User): Promise<User> {
    try {
      const userData = this.mapToPrismaUpdateData(user);

      if (user.addresses && user.addresses.length > 0) {
        for (const addr of user.addresses) {
          const addrObj = addr as any;
          const addressValue = addrObj.value || addrObj;
          const street = addressValue.street || '';
          const city = addressValue.city || null;
          const ward = addressValue.ward || null;
          const district = addressValue.district || null;
          const region = addressValue.region || null;
          const country = addressValue.country || 'Tanzania';
          // Prisma enum key must be UPPERCASE (HOME, WORK, BILLING, SHIPPING)
          // even though the DB stores lowercase via @map. Normalise here.
          const rawType = String(addressValue.type || 'home');
          const type = rawType.toUpperCase() as any;
          const isDefault = addressValue.isPrimary ?? addressValue.isDefault ?? false;
          const postalCode = addressValue.postalCode || null;
          const state = addressValue.state || null;
          const addressId = addressValue.id || addrObj.id;

          if (addressId) {
            await this.prisma.user_UserAddress.upsert({
              where: { id: addressId },
              create: {
                id: addressId,
                userId: user.id,
                type: type as any,
                street,
                city,
                ward,
                district,
                region,
                state,
                postalCode,
                country,
                isDefault
              } as any,
              update: {
                type: type as any,
                street,
                city,
                ward,
                district,
                region,
                state,
                postalCode,
                country,
                isDefault
              } as any
            });
          } else {
            await this.prisma.user_UserAddress.create({
              data: {
                userId: user.id,
                type: type as any,
                street,
                city,
                ward,
                district,
                region,
                state,
                postalCode,
                country,
                isDefault
              } as any
            });
          }
        }
      }

      const updatedUser = await this.prisma.user_User.update({
        where: { id: user.id },
        data: userData,
        include: { addresses: true }
      });

      await this.prisma.user_UserIndex.deleteMany({
        where: { userId: user.id }
      });
      await this.prisma.user_UserIndex.createMany({
        data: [
          { userId: user.id, indexType: 'email', value: this.piiService.hash(user.email.value) },
          ...(user.phoneNumber?.value ? [{ userId: user.id, indexType: 'phone', value: this.piiService.hash(user.phoneNumber.value) }] : [])
        ]
      });

      logger.info('User updated successfully', { userId: user.id });
      return this.mapToDomainEntity(updatedUser);
    } catch (error) {
      logger.error('Error updating user', { userId: user.id, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user_User.delete({
        where: { id }
      });

      logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      logger.error('Error deleting user', { userId: id, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  /**
   * Search users by email or name
   */
  async search(query: string, limit: number = 50, offset: number = 0): Promise<User[]> {
    try {
      const users = await this.prisma.user_User.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        skip: offset,
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });

      return users.map((userData: any) => this.mapToDomainEntity(userData));
    } catch (error) {
      logger.error('Error searching users', { query, limit, offset, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await this.withDbRetry('emailExists', () =>
        this.prisma.user_UserIndex.count({
          where: { indexType: 'email', value: this.piiService.hash(email) }
        })
      );

      if (count > 0) {
        return true;
      }

      return await this.legacyEmailExists(email);
    } catch (error) {
      logger.error('Error checking email existence', { email: 'REDACTED', error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Check if phone number exists
   */
  async phoneExists(phoneNumber: string): Promise<boolean> {
    try {
      const count = await this.withDbRetry('phoneExists', () =>
        this.prisma.user_UserIndex.count({
          where: { indexType: 'phone', value: this.piiService.hash(phoneNumber) }
        })
      );

      return count > 0;
    } catch (error) {
      logger.error('Error checking phone existence', { phoneNumber: 'REDACTED', error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Check if public user code exists
   */
  async publicCodeExists(code: string): Promise<boolean> {
    try {
      const count = await this.prisma.user_User.count({
        where: { publicCode: code }
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking public code existence', { code, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find multiple users by their status
   */
  async findByStatus(status: UserStatus): Promise<User[]> {
    try {
      const users = await this.prisma.user_User.findMany({
        where: { status: this.mapStatusToPrisma(status) },
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });

      return users.map(userData => this.mapToDomainEntity(userData));
    } catch (error) {
      logger.error('Error finding users by status', { status, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find multiple users by their role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    try {
      const users = await this.prisma.user_User.findMany({
        where: { role: this.mapRoleToPrisma(role) },
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });

      return users.map(userData => this.mapToDomainEntity(userData));
    } catch (error) {
      logger.error('Error finding users by role', { role, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find all users with pagination
   */
  async findAll(skip: number = 0, take: number = 100): Promise<User[]> {
    try {
      const users = await this.prisma.user_User.findMany({
        skip,
        take,
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });

      return users.map(userData => this.mapToDomainEntity(userData));
    } catch (error) {
      logger.error('Error finding all users', { skip, take, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    try {
      return await this.prisma.user_User.count();
    } catch (error) {
      logger.error('Error counting users', { error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get count of users grouped by status
   */
  async getUserCountByStatus(): Promise<Record<UserStatus, number>> {
    try {
      const results = await this.prisma.user_User.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      const counts: Record<UserStatus, number> = {
        [UserStatus.ACTIVE]: 0,
        [UserStatus.INACTIVE]: 0,
        [UserStatus.SUSPENDED]: 0,
        [UserStatus.PENDING_VERIFICATION]: 0,
        [UserStatus.DEACTIVATED]: 0,
        [UserStatus.LOCKED]: 0
      };

      results.forEach(result => {
        const mappedStatus = this.mapStatusFromPrisma(result.status);
        counts[mappedStatus] = result._count.status;
      });

      return counts;
    } catch (error) {
      logger.error('Error getting user count by status', { error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Get user registration statistics for a date range
   */
  async getUserRegistrationStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRegistrations: number;
    registrationsByRole: Record<UserRole, number>;
    registrationsByDay: Array<{ date: string; count: number }>;
  }> {
    try {
      const totalRegistrations = await this.prisma.user_User.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const roleResults = await this.prisma.user_User.groupBy({
        by: ['role'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: { role: true }
      });

      const registrationsByRole: Record<UserRole, number> = {} as Record<UserRole, number>;
      roleResults.forEach((result: any) => {
        const mappedRole = this.mapRoleFromPrisma(result.role);
        registrationsByRole[mappedRole] = result._count.role;
      });

      const registrationsByDay = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT
          DATE(createdAt) as date,
          COUNT(*) as count
        FROM "users"
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt)
      `;

      return {
        totalRegistrations,
        registrationsByRole,
        registrationsByDay: registrationsByDay.map(r => ({ date: r.date, count: Number(r.count) }))
      };
    } catch (error) {
      logger.error('Error getting user registration stats', { startDate, endDate, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // SECURITY OPERATIONS
  // ============================================================================

  /**
   * Update user password
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    try {
      // Update user_User (current schema)
      const updatedCount = await this.prisma.user_User.updateMany({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date()
        }
      });

      // Also update the legacy 'users' table if the user exists there.
      // Some users (seeded/migrated) live in the legacy table and authentication
      // reads from whichever table findById resolves the user from.
      // Writing to both tables ensures password changes are reflected regardless
      // of which table the login flow resolves to.
      try {
        await this.prisma.$executeRaw`
          UPDATE users
          SET "passwordHash" = ${passwordHash}, "passwordChangedAt" = ${new Date()}
          WHERE id = ${userId}
        `;
      } catch (legacyErr: any) {
        // Legacy table may not exist in all environments — log but don't fail
        if (!this.isMissingLegacySchemaTable(legacyErr)) {
          logger.warn('Could not update legacy users table password', { userId, error: this.formatError(legacyErr) });
        }
      }

      logger.info('User password updated', { userId, tablesUpdated: updatedCount.count > 0 ? 'user_User + users' : 'users (legacy only)' });
    } catch (error) {
      logger.error('Error updating user password', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update user status
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await this.prisma.user_User.update({
        where: { id: userId },
        data: { status: this.mapStatusToPrisma(status) }
      });

      logger.info('User status updated', { userId, status });
    } catch (error) {
      logger.error('Error updating user status', { userId, status, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update email verification status
   */
  async updateEmailVerification(userId: string, verified: boolean): Promise<void> {
    try {
      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          isEmailVerified: verified,
          emailVerifiedAt: verified ? new Date() : null
        }
      });

      logger.info('User email verification updated', { userId, verified });
    } catch (error) {
      logger.error('Error updating email verification', { userId, verified, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update phone verification status
   */
  async updatePhoneVerification(userId: string, verified: boolean): Promise<void> {
    try {
      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          isPhoneVerified: verified,
          phoneVerifiedAt: verified ? new Date() : null
        }
      });

      logger.info('User phone verification updated', { userId, verified });
    } catch (error) {
      logger.error('Error updating phone verification', { userId, verified, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Record successful login.
   *
   * Resets all brute-force counters and restores the account to ACTIVE if it
   * was previously moved to LOCKED by the failed-login threshold.  Accounts
   * that were administratively SUSPENDED or DEACTIVATED are intentionally left
   * in their current state — only a LOCKED status (which is transient and
   * time-bound) is cleared here.
   */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user_User.findUnique({
        where: { id: userId },
        select: { status: true }
      });

      const statusUpdate =
        user?.status === User_UserStatus.LOCKED ? { status: User_UserStatus.ACTIVE } : {};

      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
          lockoutUntil: null,
          ...statusUpdate
        }
      });

      logger.debug('Successful login recorded', { userId, statusRestored: user?.status === User_UserStatus.LOCKED });
    } catch (error) {
      logger.error('Error recording successful login', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Record failed login attempt.
   *
   * After reaching the threshold (5 attempts) the account is moved to LOCKED
   * and a time-based lockout window is set.  The status is only ever changed
   * to LOCKED from an ACTIVE or PENDING_VERIFICATION state — accounts that are
   * already SUSPENDED or DEACTIVATED are left untouched.
   */
  async recordFailedLogin(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user_User.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= 5;

      // Only transition to LOCKED from a login-eligible status.
      // SUSPENDED / DEACTIVATED accounts must not be silently overwritten.
      const lockableStatuses: User_UserStatus[] = [
        User_UserStatus.ACTIVE,
        User_UserStatus.PENDING_VERIFICATION,
        User_UserStatus.LOCKED
      ];
      const statusUpdate =
        shouldLock && lockableStatuses.includes(user.status)
          ? { status: User_UserStatus.LOCKED }
          : {};

      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : user.lockoutUntil,
          ...statusUpdate
        }
      });

      logger.debug('Failed login recorded', { userId, attempts: newAttempts, locked: shouldLock });
    } catch (error) {
      logger.error('Error recording failed login', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateRole(userId: string, role: UserRole): Promise<void> {
    try {
      await this.prisma.user_User.update({
        where: { id: userId },
        data: { role: this.mapRoleToPrisma(role) }
      });

      logger.info('User role updated', { userId, role });
    } catch (error) {
      logger.error('Error updating user role', { userId, role, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // ADDRESS OPERATIONS
  // ============================================================================

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const addresses = await this.prisma.user_UserAddress.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return addresses.map(addr => this.mapAddressToDomain(addr));
    } catch (error) {
      logger.error('Error getting user addresses', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Add a new address to a user
   */
  async createUserAddress(userId: string, address: Omit<UserAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<UserAddress> {
    try {
      const createdAddress = await this.prisma.user_UserAddress.create({
        data: {
          userId,
          type: String(address.type).toUpperCase() as any,
          street: address.street,
          ward: (address as any).ward || null,
          district: (address as any).district || null,
          region: (address as any).region || null,
          city: address.city || null,
          state: address.state || null,
          postalCode: address.postalCode || null,
          country: address.country,
          isDefault: address.isDefault
        } as any
      });

      if (address.isDefault) {
        await this.setDefaultAddress(userId, createdAddress.id);
      }

      logger.info('User address created', { userId, addressId: createdAddress.id });
      return this.mapAddressToDomain(createdAddress);
    } catch (error) {
      logger.error('Error creating user address', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update a user address
   */
  async updateUserAddress(userId: string, addressId: string, updates: Partial<Omit<UserAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<UserAddress> {
    try {
      const updateData: any = {};

      if (updates.type !== undefined) updateData.type = String(updates.type).toUpperCase() as any;
      if (updates.street !== undefined) updateData.street = updates.street;
      if ((updates as any).ward !== undefined) updateData.ward = (updates as any).ward || null;
      if ((updates as any).district !== undefined) updateData.district = (updates as any).district || null;
      if ((updates as any).region !== undefined) updateData.region = (updates as any).region || null;
      if (updates.city !== undefined) updateData.city = updates.city || null;
      if (updates.state !== undefined) updateData.state = updates.state;
      if (updates.postalCode !== undefined) updateData.postalCode = updates.postalCode;
      if (updates.country !== undefined) updateData.country = updates.country;
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;

      const updatedAddress = await this.prisma.user_UserAddress.update({
        where: {
          id: addressId,
          userId
        },
        data: updateData
      });

      if (updates.isDefault) {
        await this.setDefaultAddress(userId, addressId);
      }

      logger.info('User address updated', { userId, addressId });
      return this.mapAddressToDomain(updatedAddress);
    } catch (error) {
      logger.error('Error updating user address', { userId, addressId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Delete a user address
   */
  async deleteUserAddress(userId: string, addressId: string): Promise<void> {
    try {
      await this.prisma.user_UserAddress.delete({
        where: {
          id: addressId,
          userId
        }
      });

      logger.info('User address deleted', { userId, addressId });
    } catch (error) {
      logger.error('Error deleting user address', { userId, addressId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    try {
      await this.prisma.user_UserAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      await this.prisma.user_UserAddress.update({
        where: {
          id: addressId,
          userId
        },
        data: { isDefault: true }
      });

      logger.debug('Default address set', { userId, addressId });
    } catch (error) {
      logger.error('Error setting default address', { userId, addressId, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // COD REPUTATION OPERATIONS
  // ============================================================================

  async updateCODStanding(userId: string, updates: Record<string, unknown>): Promise<void> {
    await this.prisma.user_User.update({
      where: { id: userId },
      data: updates
    });
  }

  async saveCODHistory(history: {
    userId: string;
    orderId: string;
    action: string;
    reputationChange: number;
    reputationAfter: number;
    reason?: string;
  }): Promise<void> {
    await this.prisma.user_CODHistory.create({
      data: {
        userId: history.userId,
        orderId: history.orderId,
        action: history.action,
        reputationChange: history.reputationChange,
        reputationAfter: history.reputationAfter,
        reason: history.reason || null
      }
    });
  }

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const user = await this.prisma.user_User.findUnique({
        where: { id: userId },
        select: {
          language: true,
          timezone: true,
          notificationsEnabled: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        theme: 'system',
        notifications: {
          email: true,
          sms: true,
          push: true,
          marketing: false
        },
        language: user.language || 'en',
        currency: 'USD',
        timezone: user.timezone || 'UTC',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        accessibility: {
          highContrast: false,
          largeText: false,
          screenReader: false
        }
      };
    } catch (error) {
      logger.error('Error getting user preferences', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const updateData: any = {};
      if (preferences.language !== undefined) updateData.language = preferences.language;
      if (preferences.timezone !== undefined) updateData.timezone = preferences.timezone;
      if (preferences.currency !== undefined) updateData.currency = preferences.currency;

      await this.prisma.user_User.update({
        where: { id: userId },
        data: updateData
      });

      const updatedPrefs = await this.getUserPreferences(userId);
      logger.info('User preferences updated', { userId });
      return updatedPrefs;
    } catch (error) {
      logger.error('Error updating user preferences', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk update status for multiple users
   */
  async bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<{ successCount: number; failures: Array<{ userId: string; error: string }> }> {
    const results = { successCount: 0, failures: [] as Array<{ userId: string; error: string }> };

    for (const userId of userIds) {
      try {
        await this.updateStatus(userId, status);
        results.successCount++;
      } catch (error) {
        results.failures.push({ userId, error: this.formatError(error) });
        logger.error('Bulk status update failed', { userId, status, error: this.formatError(error) });
      }
    }

    logger.info('Bulk status update completed', { total: userIds.length, success: results.successCount, failures: results.failures.length });
    return results;
  }

  /**
   * Bulk delete multiple users
   */
  async bulkDelete(userIds: string[]): Promise<{ successCount: number; failures: Array<{ userId: string; error: string }> }> {
    const results = { successCount: 0, failures: [] as Array<{ userId: string; error: string }> };

    for (const userId of userIds) {
      try {
        await this.delete(userId);
        results.successCount++;
      } catch (error) {
        results.failures.push({ userId, error: this.formatError(error) });
        logger.error('Bulk delete failed', { userId, error: this.formatError(error) });
      }
    }

    logger.info('Bulk delete completed', { total: userIds.length, success: results.successCount, failures: results.failures.length });
    return results;
  }

  // ============================================================================
  // AUDIT AND SECURITY
  // ============================================================================

  /**
   * Get security events for a user
   */
  async getUserSecurityEvents(userId: string, limit: number = 50): Promise<Array<{
    id: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>> {
    try {
      const events = await this.prisma.user_AuditLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit
      });

      return events.map(event => ({
        id: event.id,
        action: event.action,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        success: event.success,
        timestamp: event.timestamp,
        metadata: event.metadata as Record<string, any>
      }));
    } catch (error) {
      logger.error('Error getting user security events', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Record a security event
   */
  async recordSecurityEvent(userId: string, event: {
    action: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.user_AuditLog.create({
        data: {
          userId,
          email: null,
          action: event.action,
          ipAddress: event.ipAddress || '',
          userAgent: event.userAgent || '',
          success: event.success,
          metadata: event.metadata || {}
        }
      });

      logger.debug('Security event recorded', { userId, action: event.action });
    } catch (error) {
      logger.error('Error recording security event', { userId, action: event.action, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // DATA EXPORT AND COMPLIANCE
  // ============================================================================

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<{
    user: User;
    addresses: UserAddress[];
    preferences: UserPreferences;
    securityEvents: Array<any>;
    orders?: any[];
  }> {
    try {
      const user = await this.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const addresses = await this.getUserAddresses(userId);
      const preferences = await this.getUserPreferences(userId);
      const securityEvents = await this.getUserSecurityEvents(userId, 100);

      logger.info('User data exported for GDPR compliance', { userId });

      return {
        user,
        addresses,
        preferences,
        securityEvents,
        orders: []
      };
    } catch (error) {
      logger.error('Error exporting user data', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // HEALTH AND MAINTENANCE
  // ============================================================================

  /**
   * Get repository health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const startTime = Date.now();
      await this.prisma.user_User.count();
      const responseTime = Date.now() - startTime;

      const details = {
        database: {
          connected: true,
          responseTime: `${responseTime}ms`,
          connectionPool: 'active'
        },
        timestamp: new Date().toISOString()
      };

      const status = responseTime > 1000 ? 'degraded' : 'healthy';

      return { status, details };
    } catch (error) {
      logger.error('Repository health check failed', { error: this.formatError(error) });
      return {
        status: 'unhealthy',
        details: {
          database: {
            connected: false,
            error: this.formatError(error)
          },
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Clean up old data from the repository
   */
  async cleanupOldData(olderThanDays: number): Promise<{ deletedUsers: number; deletedAddresses: number; deletedSecurityEvents: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      logger.info('Starting old data cleanup', { olderThanDays, cutoffDate });

      // Cleanup would be implemented based on specific business requirements
      return { deletedUsers: 0, deletedAddresses: 0, deletedSecurityEvents: 0 };
    } catch (error) {
      logger.error('Error during data cleanup', { olderThanDays, error: this.formatError(error) });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async withDbRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        if (!this.isTransientDbError(error) || attempt === maxAttempts) {
          throw error;
        }
        logger.warn('Transient database error, retrying', {
          operation,
          attempt,
          error: this.formatError(error)
        });
        await this.delay(150 * attempt);
      }
    }
    throw new Error(`Database retry attempts exhausted for ${operation}`);
  }

  private isTransientDbError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string } | null)?.code;
    return (
      code === 'P1001' ||
      code === 'P1002' ||
      message.includes("Can't reach database server") ||
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('ENOTFOUND')
    );
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Map Prisma user data to domain User entity
   */
  private mapToDomainEntity(userData: any): User {
    const addresses: Address[] = Array.isArray(userData.addresses)
      ? userData.addresses.reduce((acc: Address[], addrData: any) => {
          try {
            const mapped = this.mapAddressToDomain(addrData);
            const typeCandidate = (mapped.type as string) === 'work' ? 'business' : mapped.type;
            const validTypes = ['billing', 'shipping', 'business', 'home'];
            const resolvedType = validTypes.includes(typeCandidate as string)
              ? (typeCandidate as 'billing' | 'shipping' | 'business' | 'home')
              : 'home';

            // postalCode is nullable in the DB schema (optional for Tanzanian addresses).
            // If null/empty, use a sentinel value rather than an empty string — the validator
            // rejects empty strings but we need to preserve the address record.
            const resolvedPostalCode = mapped.postalCode && mapped.postalCode.trim()
              ? mapped.postalCode.trim()
              : null;

            // Only construct Address value object when required fields are present.
            // For Tanzania: city is optional when ward/district/region are present.
            // Authentication must not fail because an optional profile address is incomplete.
            const hasCityOrTanzaniaFields = !!(mapped.city || mapped.ward || mapped.district || mapped.region);
            if (!mapped.street || !hasCityOrTanzaniaFields || !mapped.country || !resolvedPostalCode) {
              logger.warn('Skipping address with missing required fields during user mapping — address will not be included in domain entity', {
                addressId: mapped.id,
                userId: userData.id,
                missingFields: [
                  !mapped.street ? 'street' : null,
                  !hasCityOrTanzaniaFields ? 'city/ward/district/region' : null,
                  !mapped.country ? 'country' : null,
                  !resolvedPostalCode ? 'postalCode' : null,
                ].filter(Boolean)
              });
              return acc;
            }

            acc.push(Address.create({
              id: mapped.id,
              userId: mapped.userId,
              type: resolvedType,
              isPrimary: mapped.isDefault,
              street: mapped.street,
              ward: (mapped as any).ward || undefined,
              district: (mapped as any).district || undefined,
              region: (mapped as any).region || undefined,
              city: mapped.city || undefined,
              state: mapped.state,
              postalCode: resolvedPostalCode,
              country: mapped.country,
              createdAt: mapped.createdAt || new Date(),
              updatedAt: mapped.updatedAt || new Date()
            } as any));
          } catch (addrError: any) {
            // An individual address failing validation must never prevent the user entity
            // from being reconstructed. Log the problem for investigation but continue.
            logger.warn('Skipping invalid address record during user mapping', {
              addressId: addrData?.id,
              userId: userData.id,
              error: addrError?.message || addrError,
            });
          }
          return acc;
        }, [])
      : [];
    const roles = this.extractMetadataRoles(userData);
    const metadata = {
      accountAge: 0,
      loginAttempts: userData.failedLoginAttempts ?? 0,
      lastFailedLoginAttempt: undefined,
      accountLockedUntil: userData.lockoutUntil || undefined,
      roles
    };

    // Decrypt PII fields. If decryption fails (e.g. wrong key or stale data), fall back
    // to the raw stored value so the domain entity can still be constructed; the
    // email index lookup has already matched the correct user at this point.
    const decryptedEmail = (() => {
      const raw = this.piiService.decrypt(userData.email ?? '');
      // If raw looks like a valid email it was plaintext or successfully decrypted.
      // Otherwise return a sentinel that Email.create can accept (the id-based lookup
      // already confirmed this is the right user — the email value is cosmetic here).
      return Email.isValid(raw) ? raw : `user-${userData.id}@unknown.invalid`;
    })();

    const decryptedPhone = (() => {
      if (!userData.phoneNumber) return '';
      try {
        const raw = this.piiService.decrypt(userData.phoneNumber);
        return raw;
      } catch {
        return '';
      }
    })();

    return new User({
      id: userData.id,
      publicCode: userData.publicCode ?? undefined,
      email: Email.create(decryptedEmail),
      phoneNumber: decryptedPhone ? PhoneNumber.create(decryptedPhone) : PhoneNumber.create(''),
      passwordHash: userData.passwordHash ?? undefined,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      dateOfBirth: userData.dateOfBirth || undefined,
      role: this.mapRoleFromPrisma(userData.role),
      status: this.mapStatusFromPrisma(userData.status),
      metadata,
      createdAt: userData.createdAt || new Date(),
      updatedAt: userData.updatedAt || new Date(),
      lastLoginAt: userData.lastLoginAt || undefined,
      emailVerified: userData.isEmailVerified,
      phoneVerified: userData.isPhoneVerified,
      profilePicture: userData.avatar || undefined,
      preferredLanguage: userData.language,
      preferredCurrency: userData.timezone,
      addresses,
      codEnabled: userData.codEnabled,
      codReputationScore: userData.codReputationScore,
      codSuccessfulOrders: userData.codSuccessfulOrders,
      codFailedOrders: userData.codFailedOrders,
      codTotalOrders: userData.codTotalOrders,
      codLastOrderAt: userData.codLastOrderAt || undefined,
      codSuspendedUntil: userData.codSuspendedUntil || undefined,
      codPermanentlyDisabled: userData.codPermanentlyDisabled,
      kycStatus: (userData.kycStatus as KycStatus) || KycStatus.NONE,
      kycLevel: userData.kycLevel ?? 0,
      kycSubmittedAt: userData.kycSubmittedAt || undefined,
      kycVerifiedAt: userData.kycVerifiedAt || undefined,
      kycData: (userData.kycData as Record<string, unknown> | undefined) || undefined,
      kycNationalId: userData.kycNationalId || undefined,
      kycLimitMaxListings: userData.kycLimitMaxListings ?? 5,
      kycLimitMaxTransactions: userData.kycLimitMaxTransactions ?? 1,
      kycLimitMaxEarnings: Number(userData.kycLimitMaxEarnings ?? 0)
    });
  }

  private async tryFindByIdInCurrentSchema(id: string): Promise<any | null> {
    try {
      return await this.prisma.user_User.findUnique({
        where: { id },
        include: { addresses: true }
      });
    } catch (error: any) {
      if (this.isMissingCurrentSchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  private async tryFindByEmailInCurrentSchema(email: string): Promise<{ userId: string } | null> {
    try {
      return await this.prisma.user_UserIndex.findFirst({
        where: { indexType: 'email', value: this.piiService.hash(email) },
        select: { userId: true }
      });
    } catch (error: any) {
      if (this.isMissingCurrentSchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  private async tryFindByPhoneInCurrentSchema(phoneNumber: string): Promise<{ userId: string } | null> {
    try {
      return await this.prisma.user_UserIndex.findFirst({
        where: { indexType: 'phone', value: this.piiService.hash(phoneNumber) },
        select: { userId: true }
      });
    } catch (error: any) {
      if (this.isMissingCurrentSchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  // NOTE: `${rows?.[0]}` rather than `${rows[0]}`. These legacy lookups are
  // defensive by design - they run on a fallback path and swallow missing-table
  // errors - so they must not throw a TypeError on an unexpected $queryRaw result.
  // Prisma returns [] for no rows, but a partial/mocked client can return
  // undefined, which previously turned a clean "not found" into a crash and made
  // `exportUserData` report the wrong error entirely.
  private async tryFindLegacyUserById(id: string): Promise<any | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT *
        FROM users
        WHERE id = ${id}
        LIMIT 1
      `;
      return rows?.[0] ?? null;
    } catch (error: any) {
      if (this.isMissingLegacySchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  private async tryFindLegacyIndexByEmail(email: string): Promise<{ userId: string } | null> {
    return this.tryFindLegacyIndex('email', email);
  }

  private async tryFindLegacyIndexByPhone(phoneNumber: string): Promise<{ userId: string } | null> {
    return this.tryFindLegacyIndex('phone', phoneNumber);
  }

  private async tryFindLegacyIndex(indexType: 'email' | 'phone', value: string): Promise<{ userId: string } | null> {
    try {
      const hash = this.piiService.hash(value);
      const rows = await this.prisma.$queryRaw<Array<{ userId: string }>>`
        SELECT "userId"
        FROM user_service_user_indexes
        WHERE "indexType" = ${indexType}
          AND value = ${hash}
        LIMIT 1
      `;
      return rows?.[0] ?? null;
    } catch (error: any) {
      if (this.isMissingLegacySchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  private async legacyEmailExists(email: string): Promise<boolean> {
    try {
      const legacyMatch = await this.findLegacyUserByEmailScan(email);
      if (legacyMatch) {
        return true;
      }

      const hash = this.piiService.hash(email);
      const rows = await this.prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*)::bigint AS count
        FROM user_service_user_indexes
        WHERE "indexType" = 'email'
          AND value = ${hash}
      `;
      return Number(rows[0]?.count ?? 0) > 0;
    } catch (error: any) {
      if (this.isMissingLegacySchemaTable(error)) {
        return false;
      }
      throw error;
    }
  }

  private async findLegacyUserByEmailScan(email: string): Promise<Record<string, any> | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT *
        FROM users
      `;
      const normalizedEmail = String(email).trim().toLowerCase();
      return rows.find((row) => {
        const raw = String(row.email ?? '');
        // Case 1: plain-text email stored directly (seeded/legacy users)
        if (raw.trim().toLowerCase() === normalizedEmail) {
          return true;
        }
        // Case 2: encrypted email — attempt decryption
        try {
          const decrypted = String(this.piiService.decrypt(raw)).trim().toLowerCase();
          return decrypted === normalizedEmail;
        } catch {
          return false;
        }
      }) ?? null;
    } catch (error: any) {
      if (this.isMissingLegacySchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  private async findLegacyUserByPhoneScan(phoneNumber: string): Promise<Record<string, any> | null> {
    try {
      const rows = await this.prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT *
        FROM users
      `;
      const normalizedPhone = String(phoneNumber).trim();
      return rows.find((row) => {
        try {
          const rowPhone = String(this.piiService.decrypt(String(row.phoneNumber ?? ''))).trim();
          return rowPhone === normalizedPhone;
        } catch {
          return false;
        }
      }) ?? null;
    } catch (error: any) {
      if (this.isMissingLegacySchemaTable(error)) {
        return null;
      }
      throw error;
    }
  }

  private isMissingCurrentSchemaTable(error: any): boolean {
    const message = String(error?.message || '');
    return message.includes('user_User') || message.includes('user_UserIndex') || message.includes('does not exist');
  }

  private isMissingLegacySchemaTable(error: any): boolean {
    const message = String(error?.message || '');
    return message.includes('user_service_user_indexes') || message.includes('users') || message.includes('does not exist');
  }

  private extractMetadataRoles(userData: any): UserMetadataRole[] {
    const attributes = userData?.attributes && typeof userData.attributes === 'object'
      ? userData.attributes
      : {};
    const metadata = userData?.metadata && typeof userData.metadata === 'object'
      ? userData.metadata
      : {};
    const candidates = [
      (attributes as Record<string, unknown>).roles,
      (attributes as Record<string, unknown>).allowedRoles,
      (metadata as Record<string, unknown>).roles,
      userData?.roles
    ];
    const allowedRoles = new Set(Object.values(UserMetadataRole) as string[]);

    const normalized = candidates
      .flatMap((candidate) => {
        if (Array.isArray(candidate)) {
          return candidate;
        }
        if (typeof candidate === 'string') {
          return candidate.split(',');
        }
        return [];
      })
      .map((role) => String(role).trim().toLowerCase())
      .filter((role) => allowedRoles.has(role));

    return Array.from(new Set(normalized)) as UserMetadataRole[];
  }

  /**
   * Map domain User entity to Prisma create input
   *
   * PII STORAGE POLICY: `email` and `phoneNumber` are stored in plain, normalized
   * form. They are not credentials, and encrypting them with a random-IV cipher
   * made the column unusable: `@unique` could not enforce uniqueness and no
   * query could match a plaintext address (see
   * scripts/maintenance/backfill-users-plaintext-pii.ts). Lookup runs through
   * the HMAC `user_UserIndex` table, which is the right tool for that. Passwords
   * remain one-way hashed and never leave the process.
   */
    private mapToPrismaCreateData(user: User): any {
    return {
      id: user.id,
      publicCode: user.publicCode ?? null,
      email: user.email.value.toLowerCase(),
      phoneNumber: user.phoneNumber?.value ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      role: this.mapRoleToPrisma(user.role),
      status: this.mapStatusToPrisma(user.status),
      language: user.preferredLanguage,
      timezone: user.preferredCurrency,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: user.phoneVerified,
      kycStatus: toPrismaUserKycStatus(user.kycStatus),
      kycLevel: user.kycLevel,
      kycSubmittedAt: user.kycSubmittedAt,
      kycVerifiedAt: user.kycVerifiedAt,
      kycData: user.kycData ?? null,
      kycNationalId: user.kycNationalId ?? null,
      kycLimitMaxListings: user.kycLimitMaxListings,
      kycLimitMaxTransactions: user.kycLimitMaxTransactions,
      kycLimitMaxEarnings: user.kycLimitMaxEarnings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      passwordHash: ''
    };
  }

  /**
   * Map domain User entity to Prisma update input
   *
   * Plain, normalized email/phone - see mapToPrismaCreateData for the rationale.
   */
    private mapToPrismaUpdateData(user: User): any {
      const data: Record<string, any> = {
        publicCode: user.publicCode ?? null,
      email: user.email.value.toLowerCase(),
      phoneNumber: user.phoneNumber?.value ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      role: this.mapRoleToPrisma(user.role),
      status: this.mapStatusToPrisma(user.status),
      language: user.preferredLanguage,
      timezone: user.preferredCurrency,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: user.phoneVerified,
      kycLevel: user.kycLevel,
      kycSubmittedAt: user.kycSubmittedAt,
      kycVerifiedAt: user.kycVerifiedAt,
      kycData: user.kycData ?? null,
      kycNationalId: user.kycNationalId ?? null,
      kycLimitMaxListings: user.kycLimitMaxListings,
      kycLimitMaxTransactions: user.kycLimitMaxTransactions,
      kycLimitMaxEarnings: user.kycLimitMaxEarnings,
      updatedAt: new Date()
    };
    if (user.kycStatus !== undefined) {
      data.kycStatus = toPrismaUserKycStatus(user.kycStatus);
    }
    if (user.passwordHash !== undefined) {
      data.passwordHash = user.passwordHash;
    }
    return data;
  }

  /**
   * Map Prisma user address to domain UserAddress
   */
  private mapAddressToDomain(addressData: any): UserAddress {
    return {
      id: addressData.id,
      userId: addressData.userId,
      type: addressData.type as 'home' | 'work' | 'billing' | 'shipping',
      street: addressData.street,
      ward: addressData.ward || undefined,
      district: addressData.district || undefined,
      region: addressData.region || undefined,
      city: addressData.city || undefined,
      state: addressData.state || undefined,
      postalCode: addressData.postalCode || undefined,
      country: addressData.country,
      isDefault: addressData.isDefault,
      createdAt: addressData.createdAt,
      updatedAt: addressData.updatedAt
    };
  }

  /**
   * Format error for logging
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private mapRoleToPrisma(role: UserRole): User_UserRole {
    const normalized = String(role).toLowerCase();
    switch (normalized) {
      case 'buyer':
        return User_UserRole.BUYER;
      case 'seller':
        return User_UserRole.SELLER;
      case 'supplier':
        return User_UserRole.SUPPLIER;
      case 'courier':
        return User_UserRole.COURIER;
      case 'enabler':
        return User_UserRole.ENABLER;
      case 'system':
        return User_UserRole.SYSTEM;
      default:
        throw new Error(`Unsupported user role: ${role}`);
    }
  }

  private mapRoleFromPrisma(role: User_UserRole | string): UserRole {
    const normalized = String(role).toLowerCase();
    switch (normalized) {
      case 'buyer':
        return UserRole.BUYER;
      case 'seller':
        return UserRole.SELLER;
      case 'supplier':
        return UserRole.SUPPLIER;
      case 'courier':
        return UserRole.COURIER;
      case 'enabler':
        return UserRole.ENABLER;
      case 'system':
        return UserRole.SYSTEM;
      default:
        throw new Error(`Unsupported prisma role: ${role}`);
    }
  }

  private mapStatusToPrisma(status: UserStatus): User_UserStatus {
    const normalized = String(status).toLowerCase();
    switch (normalized) {
      case 'pending_verification':
        return User_UserStatus.PENDING_VERIFICATION;
      case 'active':
        return User_UserStatus.ACTIVE;
      case 'suspended':
        return User_UserStatus.SUSPENDED;
      case 'deactivated':
        return User_UserStatus.DEACTIVATED;
      case 'locked':
        return User_UserStatus.LOCKED;
      case 'inactive':
        return User_UserStatus.DEACTIVATED;
      default:
        throw new Error(`Unsupported user status: ${status}`);
    }
  }

  private mapStatusFromPrisma(status: User_UserStatus | string): UserStatus {
    const normalized = String(status).toLowerCase();
    switch (normalized) {
      case 'pending_verification':
        return UserStatus.PENDING_VERIFICATION;
      case 'active':
        return UserStatus.ACTIVE;
      case 'suspended':
        return UserStatus.SUSPENDED;
      case 'deactivated':
        return UserStatus.DEACTIVATED;
      case 'locked':
        return UserStatus.LOCKED;
      default:
        throw new Error(`Unsupported prisma status: ${status}`);
    }
  }
}
