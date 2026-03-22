import { Request, Response } from 'express';
import { adminService } from '../../application/services/admin.service';
import { logger } from '../../infrastructure/services/logger.service';
import { ApiResponse } from '../../domain/types/auth-middleware.types';

/**
 * Admin Controller
 * Handles administrative operations for user management, security monitoring,
 * and system administration
 */
export class AdminController {
  private resolveError(
    error: unknown,
    fallbackCode: string,
    fallbackMessage: string
  ): { status: number; code: string; message: string; details?: string } {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const normalized = message.toLowerCase();

    if (normalized.includes('not found')) {
      return { status: 404, code: 'NOT_FOUND', message };
    }
    if (normalized.includes('invalid status')) {
      return { status: 400, code: 'INVALID_STATUS', message };
    }
    if (normalized.includes('invalid role')) {
      return { status: 400, code: 'INVALID_ROLE', message };
    }
    if (normalized.includes('invalid')) {
      return { status: 400, code: 'INVALID_REQUEST', message };
    }
    if (normalized.includes('unauthorized') || normalized.includes('forbidden')) {
      return { status: 403, code: 'FORBIDDEN', message };
    }

    return {
      status: 500,
      code: fallbackCode,
      message: fallbackMessage,
      details: message
    };
  }

  /**
   * Get user by ID (admin)
   * GET /api/v1/admin/users/:userId
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await adminService.getUserById(userId);

      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'User retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.getUser error', { error, userId: req.params.userId });
      const info = this.resolveError(error, 'ADMIN_USER_FETCH_FAILED', 'Failed to retrieve user');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Update user status (admin)
   * PATCH /api/v1/admin/users/:userId/status
   */
  async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const result = await adminService.updateUserStatus(userId, status, reason);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: `User status updated to ${status}`
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.updateUserStatus error', { error, userId: req.params.userId });
      const info = this.resolveError(error, 'ADMIN_STATUS_UPDATE_FAILED', 'Failed to update user status');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Update user role (admin)
   * PATCH /api/v1/admin/users/:userId/role
   */
  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role, reason } = req.body;

      const result = await adminService.updateUserRole(userId, role, reason);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: `User role updated to ${role}`
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.updateUserRole error', { error, userId: req.params.userId });
      const info = this.resolveError(error, 'ADMIN_ROLE_UPDATE_FAILED', 'Failed to update user role');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Search users (admin)
   * GET /api/v1/admin/users/search
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { query, role, status, limit = '20', offset = '0' } = req.query;

      const searchParams = {
        query: query as string | undefined,
        role: role as string | undefined,
        status: status as string | undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      };

      const result = await adminService.searchUsers(searchParams);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Users search completed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.searchUsers error', { error, query: req.query });
      const info = this.resolveError(error, 'ADMIN_USER_SEARCH_FAILED', 'Failed to search users');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Get user sessions (admin)
   * GET /api/v1/admin/users/:userId/sessions
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const sessions = await adminService.getUserSessions(userId);

      const response: ApiResponse = {
        success: true,
        data: sessions,
        message: 'User sessions retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.getUserSessions error', { error, userId: req.params.userId });
      const info = this.resolveError(error, 'ADMIN_SESSIONS_FETCH_FAILED', 'Failed to retrieve user sessions');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Terminate user sessions (admin)
   * DELETE /api/v1/admin/users/:userId/sessions
   */
  async terminateUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const result = await adminService.terminateUserSessions(userId, reason);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'User sessions terminated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.terminateUserSessions error', { error, userId: req.params.userId });
      const info = this.resolveError(error, 'ADMIN_SESSIONS_TERMINATE_FAILED', 'Failed to terminate user sessions');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Terminate specific session (admin)
   * DELETE /api/v1/admin/sessions/:sessionId
   */
  async terminateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;

      const result = await adminService.terminateSession(sessionId, reason);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Session terminated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.terminateSession error', { error, sessionId: req.params.sessionId });
      const info = this.resolveError(error, 'ADMIN_SESSION_TERMINATE_FAILED', 'Failed to terminate session');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Get audit logs
   * GET /api/v1/admin/audit
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { userId, action, startDate, endDate, limit = '100', offset = '0' } = req.query;

      const queryParams = {
        userId: userId as string | undefined,
        action: action as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      };

      const result = await adminService.getAuditLogs(queryParams);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Audit logs retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.getAuditLogs error', { error, query: req.query });
      const info = this.resolveError(error, 'ADMIN_AUDIT_LOGS_FAILED', 'Failed to retrieve audit logs');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Get security events
   * GET /api/v1/admin/security-events
   */
  async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      const { hours = '24', severity, limit = '100' } = req.query;

      const queryParams = {
        hours: parseInt(hours as string, 10),
        severity: severity as string | undefined,
        limit: parseInt(limit as string, 10)
      };

      const result = await adminService.getSecurityEvents(queryParams);

      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Security events retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.getSecurityEvents error', { error, query: req.query });
      const info = this.resolveError(error, 'ADMIN_SECURITY_EVENTS_FAILED', 'Failed to retrieve security events');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Get system statistics
   * GET /api/v1/admin/stats
   */
  async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getSystemStats();

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'System statistics retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.getSystemStats error', { error });
      const info = this.resolveError(error, 'ADMIN_SYSTEM_STATS_FAILED', 'Failed to retrieve system statistics');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Force service discovery refresh
   * POST /api/v1/admin/discovery/refresh
   */
  async refreshServiceDiscovery(req: Request, res: Response): Promise<void> {
    try {
      await adminService.refreshServiceDiscovery();

      const response: ApiResponse = {
        success: true,
        message: 'Service discovery refreshed successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.refreshServiceDiscovery error', { error });
      const info = this.resolveError(error, 'ADMIN_DISCOVERY_REFRESH_FAILED', 'Failed to refresh service discovery');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }

  /**
   * Get service health overview
   * GET /api/v1/admin/health
   */
  async getServiceHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await adminService.getServiceHealth();

      const response: ApiResponse = {
        success: true,
        data: health,
        message: 'Service health retrieved successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('AdminController.getServiceHealth error', { error });
      const info = this.resolveError(error, 'ADMIN_SERVICE_HEALTH_FAILED', 'Failed to retrieve service health');
      res.status(info.status).json({
        success: false,
        error: {
          code: info.code,
          message: info.message,
          ...(info.details ? { details: info.details } : {})
        }
      });
    }
  }
}

// Export singleton instance
export const adminController = new AdminController();
