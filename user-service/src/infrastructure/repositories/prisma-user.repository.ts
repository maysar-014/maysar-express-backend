import { PrismaClient, User as PrismaUser, UserAddress as PrismaUserAddress } from '@prisma/client';
import { IUserRepository, UserAddress } from '../../domain/repositories';
import { User, UserRole, UserStatus, UserPreferences } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { logger } from '../services/logger.service';

/**
 * Prisma User Repository Implementation
 * Implements the domain IUserRepository interface using Prisma ORM
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // CORE USER OPERATIONS
  // ============================================================================

  async findById(id: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!userData) {
        return null;
      }

      return this.mapToDomainEntity(userData);
    } catch (error) {
      logger.error('Error finding user by ID:', { id, error });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!userData) {
        return null;
      }

      return this.mapToDomainEntity(userData);
    } catch (error) {
      logger.error('Error finding user by email:', { email, error });
      throw error;
    }
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    try {
      const userData = await this.prisma.user.findFirst({
        where: { phoneNumber }
      });

      if (!userData) {
        return null;
      }

      return this.mapToDomainEntity(userData);
    } catch (error) {
      logger.error('Error finding user by phone number:', { phoneNumber, error });
      throw error;
    }
  }

  async create(user: User): Promise<User> {
    try {
      const userData = this.mapToPrismaData(user);

      const createdUser = await this.prisma.user.create({
        data: userData
      });

      logger.debug('User created successfully:', { userId: user.id });
      return this.mapToDomainEntity(createdUser);
    } catch (error) {
      logger.error('Error creating user:', { userId: user.id, error });
      throw error;
    }
  }

  async update(user: User): Promise<User> {
    try {
      const userData = this.mapToPrismaData(user);

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: userData
      });

      logger.debug('User updated successfully:', { userId: user.id });
      return this.mapToDomainEntity(updatedUser);
    } catch (error) {
      logger.error('Error updating user:', { userId: user.id, error });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id }
      });

      logger.info('User deleted successfully:', { userId: id });
    } catch (error) {
      logger.error('Error deleting user:', { userId: id, error });
      throw error;
    }
  }

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  async search(query: string, limit: number = 50, offset: number = 0): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      });

      return users.map(user => this.mapToDomainEntity(user));
    } catch (error) {
      logger.error('Error searching users:', { query, limit, offset, error });
      throw error;
    }
  }

  async findByRole(role: UserRole): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { role: role as any },
        orderBy: { createdAt: 'desc' }
      });

      return users.map(user => this.mapToDomainEntity(user));
    } catch (error) {
      logger.error('Error finding users by role:', { role, error });
      throw error;
    }
  }

  async findByStatus(status: UserStatus): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        where: { status: status as any },
        orderBy: { createdAt: 'desc' }
      });

      return users.map(user => this.mapToDomainEntity(user));
    } catch (error) {
      logger.error('Error finding users by status:', { status, error });
      throw error;
    }
  }

  // ============================================================================
  // EXISTENCE CHECKS
  // ============================================================================

  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { email }
      });

      return count > 0;
    } catch (error) {
      logger.error('Error checking email existence:', { email, error });
      throw error;
    }
  }

  async phoneExists(phoneNumber: string): Promise<boolean> {
    try {
      const count = await this.prisma.user.count({
        where: { phoneNumber }
      });

      return count > 0;
    } catch (error) {
      logger.error('Error checking phone existence:', { phoneNumber, error });
      throw error;
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  async getUserCountByStatus(): Promise<Record<UserStatus, number>> {
    try {
      const results = await this.prisma.user.groupBy({
        by: ['status'],
        _count: { status: true }
      });

      const counts: Record<UserStatus, number> = {
        [UserStatus.PENDING_VERIFICATION]: 0,
        [UserStatus.ACTIVE]: 0,
        [UserStatus.SUSPENDED]: 0,
        [UserStatus.DEACTIVATED]: 0,
        [UserStatus.LOCKED]: 0
      };

      results.forEach(result => {
        counts[result.status as UserStatus] = result._count.status;
      });

      return counts;
    } catch (error) {
      logger.error('Error getting user count by status:', error);
      throw error;
    }
  }

  async getUserRegistrationStats(startDate: Date, endDate: Date): Promise<{
    totalRegistrations: number;
    registrationsByRole: Record<UserRole, number>;
    registrationsByDay: Array<{ date: string; count: number }>;
  }> {
    try {
      // Total registrations in date range
      const totalRegistrations = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Registrations by role
      const roleResults = await this.prisma.user.groupBy({
        by: ['role'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: { role: true }
      });

      const registrationsByRole: Record<UserRole, number> = {
        [UserRole.BUYER]: 0,
        [UserRole.SELLER]: 0,
        [UserRole.SUPPLIER]: 0,
        [UserRole.COURIER]: 0,
        [UserRole.ENABLER]: 0,
        [UserRole.SYSTEM]: 0
      };

      roleResults.forEach(result => {
        registrationsByRole[result.role as UserRole] = result._count.role;
      });

      // Daily registrations
      const dailyResults = await this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT
          DATE(createdAt) as date,
          COUNT(*) as count
        FROM users
        WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt)
      `;

      return {
        totalRegistrations,
        registrationsByRole,
        registrationsByDay: dailyResults
      };
    } catch (error) {
      logger.error('Error getting user registration stats:', { startDate, endDate, error });
      throw error;
    }
  }

  // ============================================================================
  // AUTHENTICATION-RELATED OPERATIONS
  // ============================================================================

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        }
      });

      logger.debug('User password updated:', { userId });
    } catch (error) {
      logger.error('Error updating user password:', { userId, error });
      throw error;
    }
  }

  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: status as any,
          updatedAt: new Date()
        }
      });

      logger.debug('User status updated:', { userId, status });
    } catch (error) {
      logger.error('Error updating user status:', { userId, status, error });
      throw error;
    }
  }

  async updateEmailVerification(userId: string, verified: boolean): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isEmailVerified: verified,
          emailVerifiedAt: verified ? new Date() : null,
          updatedAt: new Date()
        }
      });

      logger.debug('User email verification updated:', { userId, verified });
    } catch (error) {
      logger.error('Error updating email verification:', { userId, verified, error });
      throw error;
    }
  }

  async updatePhoneVerification(userId: string, verified: boolean): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isPhoneVerified: verified,
          phoneVerifiedAt: verified ? new Date() : null,
          updatedAt: new Date()
        }
      });

      logger.debug('User phone verification updated:', { userId, verified });
    } catch (error) {
      logger.error('Error updating phone verification:', { userId, verified, error });
      throw error;
    }
  }

  async recordSuccessfulLogin(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
          lockoutUntil: null,
          updatedAt: new Date()
        }
      });

      logger.debug('Successful login recorded:', { userId });
    } catch (error) {
      logger.error('Error recording successful login:', { userId, error });
      throw error;
    }
  }

  async recordFailedLogin(userId: string): Promise<void> {
    try {
      // Get current user data
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const newAttempts = user.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= 5;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newAttempts,
          lockoutUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
          status: shouldLock ? 'LOCKED' : user.status,
          updatedAt: new Date()
        }
      });

      logger.debug('Failed login recorded:', { userId, attempts: newAttempts, locked: shouldLock });
    } catch (error) {
      logger.error('Error recording failed login:', { userId, error });
      throw error;
    }
  }

  async updateRole(userId: string, role: UserRole): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          role: role as any,
          updatedAt: new Date()
        }
      });

      logger.debug('User role updated:', { userId, role });
    } catch (error) {
      logger.error('Error updating user role:', { userId, role, error });
      throw error;
    }
  }

  // ============================================================================
  // USER ADDRESSES
  // ============================================================================

  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const addresses = await this.prisma.userAddress.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' }, // Default addresses first
          { createdAt: 'desc' }
        ]
      });

      return addresses.map(addr => this.mapAddressToDomain(addr));
    } catch (error) {
      logger.error('Error getting user addresses:', { userId, error });
      throw error;
    }
  }

  async createUserAddress(userId: string, address: Omit<UserAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<UserAddress> {
    try {
      const createdAddress = await this.prisma.userAddress.create({
        data: {
          userId,
          type: address.type,
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          isDefault: address.isDefault
        }
      });

      // If this is the default address, unset other defaults
      if (address.isDefault) {
        await this.setDefaultAddress(userId, createdAddress.id);
      }

      logger.debug('User address created:', { userId, addressId: createdAddress.id });
      return this.mapAddressToDomain(createdAddress);
    } catch (error) {
      logger.error('Error creating user address:', { userId, error });
      throw error;
    }
  }

  async updateUserAddress(userId: string, addressId: string, updates: Partial<UserAddress>): Promise<UserAddress> {
    try {
      const updatedAddress = await this.prisma.userAddress.update({
        where: {
          id: addressId,
          userId // Ensure user owns this address
        },
        data: {
          type: updates.type,
          street: updates.street,
          city: updates.city,
          state: updates.state,
          postalCode: updates.postalCode,
          country: updates.country,
          isDefault: updates.isDefault,
          updatedAt: new Date()
        }
      });

      // If this is now the default address, unset other defaults
      if (updates.isDefault) {
        await this.setDefaultAddress(userId, addressId);
      }

      logger.debug('User address updated:', { userId, addressId });
      return this.mapAddressToDomain(updatedAddress);
    } catch (error) {
      logger.error('Error updating user address:', { userId, addressId, error });
      throw error;
    }
  }

  async deleteUserAddress(userId: string, addressId: string): Promise<void> {
    try {
      await this.prisma.userAddress.delete({
        where: {
          id: addressId,
          userId // Ensure user owns this address
        }
      });

      logger.debug('User address deleted:', { userId, addressId });
    } catch (error) {
      logger.error('Error deleting user address:', { userId, addressId, error });
      throw error;
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    try {
      // First, unset all default addresses for this user
      await this.prisma.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });

      // Then set the specified address as default
      await this.prisma.userAddress.update({
        where: {
          id: addressId,
          userId
        },
        data: { isDefault: true }
      });

      logger.debug('Default address set:', { userId, addressId });
    } catch (error) {
      logger.error('Error setting default address:', { userId, addressId, error });
      throw error;
    }
  }

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const user = await this.prisma.user.findUnique({
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
        language: user.language || 'en',
        timezone: user.timezone || 'UTC',
        notificationsEnabled: user.notificationsEnabled ?? true
      };
    } catch (error) {
      logger.error('Error getting user preferences:', { userId, error });
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          language: preferences.language,
          timezone: preferences.timezone,
          notificationsEnabled: preferences.notificationsEnabled,
          updatedAt: new Date()
        }
      });

      const updatedPrefs = await this.getUserPreferences(userId);
      logger.debug('User preferences updated:', { userId });
      return updatedPrefs;
    } catch (error) {
      logger.error('Error updating user preferences:', { userId, error });
      throw error;
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<{ successCount: number; failures: Array<{ userId: string; error: string }> }> {
    const results = { successCount: 0, failures: [] as Array<{ userId: string; error: string }> };

    for (const userId of userIds) {
      try {
        await this.updateStatus(userId, status);
        results.successCount++;
      } catch (error: any) {
        results.failures.push({ userId, error: error.message });
        logger.error('Bulk status update failed:', { userId, status, error: error.message });
      }
    }

    logger.info('Bulk status update completed:', { total: userIds.length, success: results.successCount, failures: results.failures.length });
    return results;
  }

  async bulkDelete(userIds: string[]): Promise<{ successCount: number; failures: Array<{ userId: string; error: string }> }> {
    const results = { successCount: 0, failures: [] as Array<{ userId: string; error: string }> };

    for (const userId of userIds) {
      try {
        await this.delete(userId);
        results.successCount++;
      } catch (error: any) {
        results.failures.push({ userId, error: error.message });
        logger.error('Bulk delete failed:', { userId, error: error.message });
      }
    }

    logger.info('Bulk delete completed:', { total: userIds.length, success: results.successCount, failures: results.failures.length });
    return results;
  }

  // ============================================================================
  // AUDIT AND SECURITY
  // ============================================================================

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
      const events = await this.prisma.auditLog.findMany({
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
      logger.error('Error getting user security events:', { userId, error });
      throw error;
    }
  }

  async recordSecurityEvent(userId: string, event: {
    action: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          email: null, // Will be populated from user data if needed
          action: event.action,
          ipAddress: event.ipAddress || '',
          userAgent: event.userAgent || '',
          success: event.success,
          metadata: event.metadata || {}
        }
      });

      logger.debug('Security event recorded:', { userId, action: event.action });
    } catch (error) {
      logger.error('Error recording security event:', { userId, action: event.action, error });
      throw error;
    }
  }

  // ============================================================================
  // DATA EXPORT AND COMPLIANCE
  // ============================================================================

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

      // Note: Orders would be fetched from Order Service in a real implementation
      const orders = [];

      logger.info('User data exported for GDPR compliance:', { userId });

      return {
        user,
        addresses,
        preferences,
        securityEvents,
        orders
      };
    } catch (error) {
      logger.error('Error exporting user data:', { userId, error });
      throw error;
    }
  }

  // ============================================================================
  // HEALTH AND MAINTENANCE
  // ============================================================================

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      // Test database connectivity
      const startTime = Date.now();
      await this.prisma.user.count();
      const responseTime = Date.now() - startTime;

      // Check connection pool status
      const connectionStatus = await this.prisma.$queryRaw`SELECT 1 as health_check`;

      const details = {
        database: {
          connected: true,
          responseTime: `${responseTime}ms`,
          connectionPool: 'active'
        },
        timestamp: new Date().toISOString()
      };

      // Determine health status
      const status = responseTime > 1000 ? 'degraded' : 'healthy';

      return { status, details };
    } catch (error) {
      logger.error('Repository health check failed:', error);
      return {
        status: 'unhealthy',
        details: {
          database: {
            connected: false,
            error: (error as Error).message
          },
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async cleanupOldData(olderThanDays: number): Promise<{
    deletedUsers: number;
    deletedAddresses: number;
    deletedSecurityEvents: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Delete old security events (keep last 100 per user)
      const deletedSecurityEvents = await this.prisma.$executeRaw`
        DELETE FROM audit_logs
        WHERE id IN (
          SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY timestamp DESC) as rn
            FROM audit_logs
            WHERE "userId" IS NOT NULL
          ) ranked
          WHERE rn > 100
          AND timestamp < ${cutoffDate}
        )
      `;

      // Note: User deletion would be handled separately with business logic
      // This is just for old audit data cleanup

      logger.info('Old data cleanup completed:', {
        deletedSecurityEvents,
        cutoffDate: cutoffDate.toISOString()
      });

      return {
        deletedUsers: 0, // Would be handled by business logic
        deletedAddresses: 0, // Would be handled by business logic
        deletedSecurityEvents: Number(deletedSecurityEvents)
      };
    } catch (error) {
      logger.error('Error during data cleanup:', { olderThanDays, error });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapToDomainEntity(userData: PrismaUser): User {
    return User.reconstitute({
      id: userData.id,
      email: Email.fromTrusted(userData.email),
      passwordHash: PasswordHash.fromHash(userData.passwordHash),
      role: userData.role as UserRole,
      status: userData.status as UserStatus,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      firstName: userData.firstName || undefined,
      lastName: userData.lastName || undefined,
      phoneNumber: userData.phoneNumber ? PhoneNumber.fromTrusted(userData.phoneNumber) : undefined,
      dateOfBirth: userData.dateOfBirth || undefined,
      avatar: userData.avatar || undefined,
      isEmailVerified: userData.isEmailVerified,
      isPhoneVerified: userData.isPhoneVerified,
      emailVerifiedAt: userData.emailVerifiedAt || undefined,
      phoneVerifiedAt: userData.phoneVerifiedAt || undefined,
      failedLoginAttempts: userData.failedLoginAttempts,
      lockoutUntil: userData.lockoutUntil || undefined,
      lastLoginAt: userData.lastLoginAt || undefined,
      passwordChangedAt: userData.passwordChangedAt || undefined,
      twoFactorEnabled: userData.twoFactorEnabled,
      twoFactorSecret: userData.twoFactorSecret || undefined,
      language: userData.language,
      timezone: userData.timezone,
      notificationsEnabled: userData.notificationsEnabled,
      attributes: userData.attributes as Record<string, any> || undefined
    });
  }

  private mapToPrismaData(user: User): any {
    return {
      id: user.id,
      email: user.email.toString(),
      passwordHash: user.passwordHash.value,
      role: user.role as any,
      status: user.status as any,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber?.toString(),
      dateOfBirth: user.dateOfBirth,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      failedLoginAttempts: user.failedLoginAttempts,
      lockoutUntil: user.lockoutUntil,
      lastLoginAt: user.lastLoginAt,
      passwordChangedAt: user.passwordChangedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorSecret: user.twoFactorSecret,
      language: user.preferences.language,
      timezone: user.preferences.timezone,
      notificationsEnabled: user.preferences.notificationsEnabled,
      attributes: user.attributes,
      createdAt: user.createdAt,
      updatedAt: new Date()
    };
  }

  private mapAddressToDomain(addressData: PrismaUserAddress): UserAddress {
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
}
