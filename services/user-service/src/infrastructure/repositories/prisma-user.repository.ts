import { PrismaClient, User_UserRole, User_UserStatus } from '@prisma/client';
import { IUserRepository, UserAddress } from '../../domain/repositories';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { UserPreferences } from '../../domain/types/user.types';
import { Email } from '../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
import { logger } from '../services/logger.service';
import { PiiEncryptionService } from '../../../../../shared/encryption/pii-encryption.service';

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
      const userData = await this.prisma.user_User.findUnique({
        where: { id },
        include: { addresses: true }
      });

      if (!userData) {
        return null;
      }

      return this.mapToDomainEntity(userData);
    } catch (error) {
      logger.error('Error finding user by ID', { userId: id, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Find a user by their email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const index = await this.prisma.user_UserIndex.findFirst({
        where: { indexType: 'email', value: this.piiService.hash(email) }
      });

      if (!index) {
        return null;
      }

      return this.findById(index.userId);
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
      const index = await this.prisma.user_UserIndex.findFirst({
        where: { indexType: 'phone', value: this.piiService.hash(phoneNumber) }
      });

      if (!index) {
        return null;
      }

      return this.findById(index.userId);
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
      const count = await this.prisma.user_UserIndex.count({
        where: { indexType: 'email', value: this.piiService.hash(email) }
      });

      return count > 0;
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
      const count = await this.prisma.user_UserIndex.count({
        where: { indexType: 'phone', value: this.piiService.hash(phoneNumber) }
      });

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
      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date()
        }
      });

      logger.info('User password updated', { userId });
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
   * Record successful login
   */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
          lockoutUntil: null
        }
      });

      logger.debug('Successful login recorded', { userId });
    } catch (error) {
      logger.error('Error recording successful login', { userId, error: this.formatError(error) });
      throw error;
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user_User.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= 5;

      await this.prisma.user_User.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
          status: shouldLock ? User_UserStatus.LOCKED : user.status
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
          type: address.type as any,
          street: address.street,
          city: address.city,
          state: address.state || null,
          postalCode: address.postalCode || null,
          country: address.country,
          isDefault: address.isDefault
        }
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

      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.street !== undefined) updateData.street = updates.street;
      if (updates.city !== undefined) updateData.city = updates.city;
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

  /**
   * Map Prisma user data to domain User entity
   */
  private mapToDomainEntity(userData: any): User {
    // Note: Addresses are returned separately through getUserAddresses()
    // For domain entity mapping, we don't include addresses here
    const addresses: Address[] = [];
    const metadata = {
      accountAge: 0,
      loginAttempts: userData.failedLoginAttempts ?? 0,
      lastFailedLoginAttempt: undefined,
      accountLockedUntil: userData.lockoutUntil || undefined
    };

    return new User({
      id: userData.id,
      publicCode: userData.publicCode ?? undefined,
      email: Email.create(this.piiService.decrypt(userData.email)),
      phoneNumber: userData.phoneNumber ? PhoneNumber.create(this.piiService.decrypt(userData.phoneNumber)) : PhoneNumber.create(''),
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
      codPermanentlyDisabled: userData.codPermanentlyDisabled
    });
  }

  /**
   * Map domain User entity to Prisma create input
   */
    private mapToPrismaCreateData(user: User): any {
      return {
        id: user.id,
        publicCode: user.publicCode ?? null,
        email: this.piiService.encrypt(user.email.value),
      phoneNumber: user.phoneNumber?.value ? this.piiService.encrypt(user.phoneNumber.value) : null,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      role: this.mapRoleToPrisma(user.role),
      status: this.mapStatusToPrisma(user.status),
      language: user.preferredLanguage,
      timezone: user.preferredCurrency,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      passwordHash: ''
    };
  }

  /**
   * Map domain User entity to Prisma update input
   */
    private mapToPrismaUpdateData(user: User): any {
      return {
        publicCode: user.publicCode ?? null,
        email: this.piiService.encrypt(user.email.value),
      phoneNumber: user.phoneNumber?.value ? this.piiService.encrypt(user.phoneNumber.value) : null,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      role: this.mapRoleToPrisma(user.role),
      status: this.mapStatusToPrisma(user.status),
      language: user.preferredLanguage,
      timezone: user.preferredCurrency,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: user.phoneVerified,
      updatedAt: new Date()
    };
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
      city: addressData.city,
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
