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
}

// Export singleton instance
export const adminRepository = new AdminRepository();
