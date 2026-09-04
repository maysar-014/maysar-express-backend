import { Auth_UserRole, Auth_UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma-client';
import { logger } from '../services/logger.service';

const roleMap: Record<string, Auth_UserRole> = {
  buyer: Auth_UserRole.BUYER,
  seller: Auth_UserRole.SELLER,
  supplier: Auth_UserRole.SUPPLIER,
  courier: Auth_UserRole.COURIER,
  enabler: Auth_UserRole.ENABLER,
  system: Auth_UserRole.SYSTEM
};

const statusMap: Record<string, Auth_UserStatus> = {
  active: Auth_UserStatus.ACTIVE,
  suspended: Auth_UserStatus.SUSPENDED,
  deactivated: Auth_UserStatus.DEACTIVATED,
  locked: Auth_UserStatus.LOCKED,
  pending_verification: Auth_UserStatus.PENDING_VERIFICATION
};

const normalizeRole = (role?: string | null): string | undefined =>
  role ? String(role).toLowerCase() : undefined;

const normalizeStatus = (status?: string | null): string | undefined =>
  status ? String(status).toLowerCase() : undefined;

const resolveRoleEnum = (role?: string): Auth_UserRole | undefined =>
  role ? roleMap[String(role).toLowerCase()] : undefined;

const resolveStatusEnum = (status?: string): Auth_UserStatus | undefined =>
  status ? statusMap[String(status).toLowerCase()] : undefined;

/**
 * Admin Repository
 * Handles database operations for admin functionality
 */
export class AdminRepository {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return null;
      }

      return {
        userId: user.id,
        email: user.email,
        role: normalizeRole(user.role),
        status: normalizeStatus(user.status),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        permissions: []
      };
    } catch (error) {
      logger.error('AdminRepository.getUserById error', { error, userId });
      throw error;
    }
  }

  /**
   * Update user status
   * Updates both auth_users (auth-service local copy) and user_User (user-service source of truth)
   * so that login — which reads user_User — sees the correct status immediately.
   */
  async updateUserStatus(userId: string, status: string, reason?: string): Promise<any> {
    try {
      const statusEnum = resolveStatusEnum(status);
      if (!statusEnum) {
        throw new Error('Invalid status');
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { status: statusEnum }
      });

      // Also update the user-service users table (user_User / @@map("users")).
      // Login reads user_User.status via UserServiceRepository.findByEmail, so both tables
      // must agree. When activating, also clear lockout fields so login succeeds immediately.
      // Ignore P2025 (record not found) in case the row doesn't exist there.
      try {
        await prisma.user_User.update({
          where: { id: userId },
          data: {
            status: status as any,
            ...(status === 'active' ? { failedLoginAttempts: 0, lockoutUntil: null } : {})
          }
        });
      } catch (syncError: any) {
        if (syncError?.code !== 'P2025') {
          logger.warn('AdminRepository: user_User status sync failed', { userId, status, error: syncError?.message });
        }
      }

      return {
        userId: updated.id,
        status: normalizeStatus(updated.status),
        reason,
        updatedAt: updated.updatedAt
      };
    } catch (error) {
      logger.error('AdminRepository.updateUserStatus error', { error, userId, status });
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<any> {
    try {
      const roleEnum = resolveRoleEnum(role);
      if (!roleEnum) {
        throw new Error('Invalid role');
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: roleEnum }
      });

      return {
        userId: updated.id,
        role: normalizeRole(updated.role),
        updatedAt: updated.updatedAt
      };
    } catch (error) {
      logger.error('AdminRepository.updateUserRole error', { error, userId, role });
      throw error;
    }
  }

  /**
   * Search users
   */
  async searchUsers(params: {
    query?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[]; total: number }> {
    try {
      const where: Prisma.UserWhereInput = {};
      const query = params.query?.trim();
      if (query) {
        where.OR = [
          { email: { contains: query, mode: 'insensitive' } },
          { publicCode: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } }
        ];
      }

      const roleEnum = resolveRoleEnum(params.role);
      if (roleEnum) {
        where.role = roleEnum;
      }

      const statusEnum = resolveStatusEnum(params.status);
      if (statusEnum) {
        where.status = statusEnum;
      }

      const limit = params.limit ?? 20;
      const offset = params.offset ?? 0;

      const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.user.count({ where })
      ]);

      return {
        users: users.map(user => ({
          userId: user.id,
          email: user.email,
          role: normalizeRole(user.role),
          status: normalizeStatus(user.status),
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        })),
        total
      };
    } catch (error) {
      logger.error('AdminRepository.searchUsers error', { error, params });
      throw error;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return sessions.map(session => ({
        sessionId: session.id,
        userId: session.userId,
        deviceInfo: { userAgent: session.userAgent },
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.createdAt,
        expiresAt: session.expiresAt,
        isActive: session.expiresAt > new Date()
      }));
    } catch (error) {
      logger.error('AdminRepository.getUserSessions error', { error, userId });
      throw error;
    }
  }

  /**
   * Terminate user sessions
   */
  async terminateUserSessions(userId: string): Promise<{ terminatedCount: number }> {
    try {
      const terminatedCount = await prisma.$transaction(async (tx) => {
        const result = await tx.session.deleteMany({ where: { userId } });
        const userSessionDelegate = (tx as any).user_Session;
        if (userSessionDelegate) {
          await userSessionDelegate.deleteMany({ where: { userId } });
        }
        return result.count;
      });

      return { terminatedCount };
    } catch (error) {
      logger.error('AdminRepository.terminateUserSessions error', { error, userId });
      throw error;
    }
  }

  /**
   * Terminate specific session
   */
  async terminateSession(sessionId: string): Promise<{ terminated: boolean }> {
    try {
      const terminated = await prisma.$transaction(async (tx) => {
        const result = await tx.session.deleteMany({ where: { id: sessionId } });
        const userSessionDelegate = (tx as any).user_Session;
        if (userSessionDelegate) {
          await userSessionDelegate.deleteMany({ where: { id: sessionId } });
        }
        return result.count > 0;
      });

      return { terminated };
    } catch (error) {
      logger.error('AdminRepository.terminateSession error', { error, sessionId });
      throw error;
    }
  }

  /**
   * Verify phone number for a user (admin bypass — no Firebase OTP required)
   * Tries all three user tables to handle cross-service ID mismatches.
   * The buyer ID usr_... may exist in auth_users, auth_user_sync, or users — we try all.
   */
  async verifyPhone(userId: string): Promise<{ userId: string; isPhoneVerified: boolean; updatedAt: Date }> {
    try {
      let updatedAt = new Date();
      let found = false;

      // 1. Try auth_users (prisma.user → @@map("auth_users"))
      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { isPhoneVerified: true }
        });
        updatedAt = updated.updatedAt;
        found = true;
      } catch (authUserErr: any) {
        if (authUserErr?.code !== 'P2025') {
          logger.warn('AdminRepository.verifyPhone: auth_users update failed', { userId, error: authUserErr?.message });
        }
      }

      // 2. Try auth_user_sync (prisma.auth_User → @@map("auth_user_sync"))
      try {
        await prisma.auth_User.update({
          where: { id: userId },
          data: { isPhoneVerified: true }
        });
        found = true;
      } catch (syncError: any) {
        if (syncError?.code !== 'P2025') {
          logger.warn('AdminRepository: auth_user_sync phone sync failed', { userId, error: syncError?.message });
        }
      }

      // 3. Try user_User (prisma.user_User → @@map("users"))
      try {
        const userUserUpdated = await (prisma as any).user_User.update({
          where: { id: userId },
          data: { isPhoneVerified: true }
        });
        updatedAt = userUserUpdated.updatedAt ?? updatedAt;
        found = true;
      } catch (syncError: any) {
        if (syncError?.code !== 'P2025') {
          logger.warn('AdminRepository: user_User phone sync failed', { userId, error: syncError?.message });
        }
      }

      if (!found) {
        // User not found in any table — throw a structured not-found error
        const err: any = new Error(`User ${userId} not found in any user table`);
        err.code = 'P2025';
        throw err;
      }

      return {
        userId,
        isPhoneVerified: true,
        updatedAt
      };
    } catch (error) {
      logger.error('AdminRepository.verifyPhone error', { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export const adminRepository = new AdminRepository();
