import { adminRepository } from '../../infrastructure/repositories/admin.repository';
import { logger } from '../../infrastructure/services/logger.service';
import { auditService } from './audit.service';
import { securityService } from './security.service';
import { systemService } from './system.service';
import { serviceDiscovery } from '../../infrastructure/services/service-discovery.service';

/**
 * Admin Service
 * Handles administrative operations for user management, security monitoring,
 * and system administration
 */
export class AdminService {
  /**
   * Get user by ID (admin)
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const user = await adminRepository.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'GET_USER',
        resource: 'user',
        details: { targetUserId: userId }
      });

      return {
        userId: user.userId,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        permissions: user.permissions || []
      };
    } catch (error) {
      logger.error('AdminService.getUserById error', { error, userId });
      throw error;
    }
  }

  /**
   * Update user status (admin)
   */
  async updateUserStatus(userId: string, status: string, reason?: string): Promise<any> {
    try {
      const validStatuses = ['active', 'suspended', 'deactivated', 'locked'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const result = await adminRepository.updateUserStatus(userId, status, reason);

      // Log admin action and security event
      await Promise.all([
        auditService.logAuditEvent({
          userId: 'admin',
          action: 'UPDATE_USER_STATUS',
          resource: 'user',
          details: { targetUserId: userId, status, reason }
        }),
        securityService.logSecurityEvent({
          type: 'admin_action',
          userId: 'admin',
          ipAddress: 'admin',
          userAgent: 'admin',
          timestamp: new Date(),
          details: { targetUserId: userId, action: 'status_update', status, reason }
        })
      ]);

      // If user is being suspended/deactivated, terminate their sessions
      if (['suspended', 'deactivated', 'locked'].includes(status)) {
        await this.terminateUserSessions(userId, `User status changed to ${status}: ${reason || 'No reason provided'}`);
      }

      return {
        userId,
        status,
        reason,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('AdminService.updateUserStatus error', { error, userId, status });
      throw error;
    }
  }

  /**
   * Update user role (admin)
   */
  async updateUserRole(userId: string, role: string, reason?: string): Promise<any> {
    try {
      const validRoles = ['buyer', 'seller', 'supplier', 'courier', 'enabler'];
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role');
      }

      const result = await adminRepository.updateUserRole(userId, role);

      // Log admin action and security event
      await Promise.all([
        auditService.logAuditEvent({
          userId: 'admin',
          action: 'UPDATE_USER_ROLE',
          resource: 'user',
          details: { targetUserId: userId, role, reason }
        }),
        securityService.logSecurityEvent({
          type: 'admin_action',
          userId: 'admin',
          ipAddress: 'admin',
          userAgent: 'admin',
          timestamp: new Date(),
          details: { targetUserId: userId, action: 'role_update', role, reason }
        })
      ]);

      return {
        userId,
        role,
        reason,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('AdminService.updateUserRole error', { error, userId, role });
      throw error;
    }
  }

  /**
   * Search users (admin)
   */
  async searchUsers(params: {
    query?: string;
    role?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      const result = await adminRepository.searchUsers(params);

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'SEARCH_USERS',
        resource: 'user',
        details: params
      });

      return {
        users: result.users.map(user => ({
          userId: user.userId,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        })),
        total: result.total,
        limit: params.limit,
        offset: params.offset
      };
    } catch (error) {
      logger.error('AdminService.searchUsers error', { error, params });
      throw error;
    }
  }

  /**
   * Get user sessions (admin)
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      const sessions = await adminRepository.getUserSessions(userId);

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'GET_USER_SESSIONS',
        resource: 'session',
        details: { targetUserId: userId }
      });

      return sessions.map(session => ({
        sessionId: session.sessionId,
        userId: session.userId,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isActive: session.isActive
      }));
    } catch (error) {
      logger.error('AdminService.getUserSessions error', { error, userId });
      throw error;
    }
  }

  /**
   * Terminate user sessions (admin)
   */
  async terminateUserSessions(userId: string, reason?: string): Promise<any> {
    try {
      const result = await adminRepository.terminateUserSessions(userId);

      // Log admin action and security event
      await Promise.all([
        auditService.logAuditEvent({
          userId: 'admin',
          action: 'TERMINATE_USER_SESSIONS',
          resource: 'session',
          details: { targetUserId: userId, reason, terminatedCount: result.terminatedCount }
        }),
        securityService.logSecurityEvent({
          type: 'admin_action',
          userId: 'admin',
          ipAddress: 'admin',
          userAgent: 'admin',
          timestamp: new Date(),
          details: { targetUserId: userId, action: 'terminate_sessions', reason, terminatedCount: result.terminatedCount }
        })
      ]);

      return {
        userId,
        terminatedCount: result.terminatedCount,
        reason,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('AdminService.terminateUserSessions error', { error, userId });
      throw error;
    }
  }

  /**
   * Terminate specific session (admin)
   */
  async terminateSession(sessionId: string, reason?: string): Promise<any> {
    try {
      const result = await adminRepository.terminateSession(sessionId);

      // Log admin action and security event
      await Promise.all([
        auditService.logAuditEvent({
          userId: 'admin',
          action: 'TERMINATE_SESSION',
          resource: 'session',
          details: { sessionId, reason }
        }),
        securityService.logSecurityEvent({
          type: 'admin_action',
          userId: 'admin',
          ipAddress: 'admin',
          userAgent: 'admin',
          timestamp: new Date(),
          details: { sessionId, action: 'terminate_session', reason }
        })
      ]);

      return {
        sessionId,
        terminated: result.terminated,
        reason,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('AdminService.terminateSession error', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      const result = await auditService.getAuditLogs(params);

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'GET_AUDIT_LOGS',
        resource: 'audit',
        details: params
      });

      return {
        logs: result.logs,
        total: result.total,
        limit: params.limit,
        offset: params.offset
      };
    } catch (error) {
      logger.error('AdminService.getAuditLogs error', { error, params });
      throw error;
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(params: {
    hours?: number;
    severity?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const events = await securityService.getSecurityEvents(params);

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'GET_SECURITY_EVENTS',
        resource: 'security',
        details: params
      });

      return events.map(event => ({
        type: event.type,
        userId: event.userId,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: event.timestamp,
        details: event.details
      }));
    } catch (error) {
      logger.error('AdminService.getSecurityEvents error', { error, params });
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    try {
      const stats = await systemService.getSystemStats();

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'GET_SYSTEM_STATS',
        resource: 'system',
        details: {}
      });

      return stats;
    } catch (error) {
      logger.error('AdminService.getSystemStats error', { error });
      throw error;
    }
  }

  /**
   * Force service discovery refresh
   */
  async refreshServiceDiscovery(): Promise<void> {
    try {
      await serviceDiscovery.refresh();

      // Log admin action and security event
      await Promise.all([
        auditService.logAuditEvent({
          userId: 'admin',
          action: 'REFRESH_SERVICE_DISCOVERY',
          resource: 'service-discovery',
          details: {}
        }),
        securityService.logSecurityEvent({
          type: 'admin_action',
          userId: 'admin',
          ipAddress: 'admin',
          userAgent: 'admin',
          timestamp: new Date(),
          details: { action: 'refresh_service_discovery' }
        })
      ]);
    } catch (error) {
      logger.error('AdminService.refreshServiceDiscovery error', { error });
      throw error;
    }
  }

  /**
   * Get service health overview
   */
  async getServiceHealth(): Promise<any> {
    try {
      const health = await systemService.getServiceHealth();

      // Log admin action
      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'GET_SERVICE_HEALTH',
        resource: 'system',
        details: {}
      });

      return health;
    } catch (error) {
      logger.error('AdminService.getServiceHealth error', { error });
      throw error;
    }
  }

  /**
   * Admin bypass: mark a user's phone as verified without Firebase OTP.
   * Used by E2E setup and admin tooling.
   */
  async verifyPhone(userId: string): Promise<{ userId: string; isPhoneVerified: boolean; updatedAt: Date }> {
    try {
      const result = await adminRepository.verifyPhone(userId);

      await auditService.logAuditEvent({
        userId: 'admin',
        action: 'VERIFY_PHONE',
        resource: 'user',
        details: { targetUserId: userId }
      });

      return result;
    } catch (error) {
      logger.error('AdminService.verifyPhone error', { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();