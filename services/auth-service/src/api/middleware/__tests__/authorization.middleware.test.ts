import { Request, Response, NextFunction } from 'express';
import { AuthorizationMiddleware, AuthorizationMiddlewareFactory } from '../authorization.middleware';
import { DEFAULT_AUTHZ_CONFIG } from '../authorization.middleware';
import { logger } from '../../../infrastructure/services/logger.service';

const prismaAuditLogCreateMock = jest.fn();
const serviceDiscoveryGetUrlMock = jest.fn();

jest.mock('../../../infrastructure/database/prisma-client', () => ({
  prisma: {
    auditLog: {
      create: prismaAuditLogCreateMock
    }
  }
}));

jest.mock('../../../infrastructure/services/service-discovery.service', () => ({
  serviceDiscovery: {
    getServiceUrl: (...args: unknown[]) => serviceDiscoveryGetUrlMock(...args)
  }
}));

// Mock dependencies
jest.mock('../../../infrastructure/services/logger.service', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('AuthorizationMiddleware', () => {
  let middleware: AuthorizationMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new AuthorizationMiddleware();
    mockRequest = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: [],
        attributes: {
          accountCreated: new Date().toISOString()
        },
        sessionInfo: {
          sessionId: 'session-123',
          deviceId: 'device-123',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          loginTime: new Date(),
          lastActivity: new Date()
        },
        securityContext: {
          mfaEnabled: true,
          accountStatus: 'active',
          passwordLastChanged: new Date(),
          failedLoginAttempts: 0
        }
      },
      params: {},
      get: jest.fn().mockReturnValue('test-agent'),
      ip: '127.0.0.1'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
    serviceDiscoveryGetUrlMock.mockReturnValue('http://catalog');
    prismaAuditLogCreateMock.mockResolvedValue(undefined);
  });

  describe('Role-Based Authorization', () => {
    it('should allow access for user with required role', async () => {
      const roleMiddleware = middleware.authorizeRoles(['user']);

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for user without required role', async () => {
      const roleMiddleware = middleware.authorizeRoles(['admin']);

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          details: {
            requiredRoles: ['admin'],
            userRoles: ['user'],
            timestamp: expect.any(String)
          }
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access for user with any of multiple required roles', async () => {
      const roleMiddleware = middleware.authorizeRoles(['admin', 'user']);

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = undefined;
      const roleMiddleware = middleware.authorizeRoles(['user']);

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Authentication required',
          details: {
            requiredRoles: ['user'],
            userRoles: [],
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('Permission-Based Authorization', () => {
    it('should allow access for user with required permission', async () => {
      const permission = {
        resource: 'products',
        action: 'read',
        scope: 'public'
      };
      mockRequest.user!.permissions = ['products:read:public'];
      const permissionMiddleware = middleware.authorizePermissions(permission);

      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for user without required permission', async () => {
      const permission = {
        resource: 'products',
        action: 'write',
        scope: 'private'
      };
      const permissionMiddleware = middleware.authorizePermissions(permission);

      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          details: {
            requiredPermissions: [permission],
            userPermissions: [],
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should allow access with wildcard permissions', async () => {
      const permission = {
        resource: 'products',
        action: 'read',
        scope: 'public'
      };
      mockRequest.user!.permissions = ['*:*:*'];
      const permissionMiddleware = middleware.authorizePermissions(permission);

      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple required permissions', async () => {
      const permissions = [
        {
          resource: 'products',
          action: 'read',
          scope: 'public'
        },
        {
          resource: 'orders',
          action: 'read',
          scope: 'own'
        }
      ];
      mockRequest.user!.permissions = ['products:read:public', 'orders:read:own'];
      const permissionMiddleware = middleware.authorizePermissions(permissions);

      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Resource Ownership Authorization', () => {
    it('should allow access to owned resource', async () => {
      mockRequest.params = { id: 'user-123' };
      jest.spyOn(middleware as any, 'fetchJson').mockResolvedValueOnce({
        statusCode: 200,
        body: { ownerId: 'user-123' }
      });
      const ownershipMiddleware = middleware.authorizeResourceOwnership('products', 'id');

      await ownershipMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access to non-owned resource', async () => {
      mockRequest.params = { id: 'user-456' };
      jest.spyOn(middleware as any, 'fetchJson').mockResolvedValueOnce({
        statusCode: 200,
        body: { ownerId: 'user-999' }
      });
      const ownershipMiddleware = middleware.authorizeResourceOwnership('products', 'id');

      await ownershipMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESOURCE_ACCESS_DENIED',
          message: 'You do not own this resource or have access to it'
        }
      });
    });

    it('should allow admin access to any resource', async () => {
      mockRequest.user!.roles = ['admin'];
      mockRequest.params = { id: 'user-456' };
      jest.spyOn(middleware as any, 'fetchJson').mockResolvedValueOnce({
        statusCode: 200,
        body: { ownerId: 'user-999' }
      });
      const ownershipMiddleware = middleware.authorizeResourceOwnership('products', 'id');

      await ownershipMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when resource ID is missing', async () => {
      const ownershipMiddleware = middleware.authorizeResourceOwnership('products', 'id');

      await ownershipMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_RESOURCE_ID',
          message: 'Resource ID parameter missing'
        }
      });
    });
  });

  describe('Admin Authorization', () => {
    it('should allow admin access', async () => {
      mockRequest.user!.roles = ['admin'];
      const adminMiddleware = middleware.authorizeAdmin();

      await adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-admin access', async () => {
      const adminMiddleware = middleware.authorizeAdmin();

      await adminMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          details: {
            requiredRoles: ['admin', 'superuser'],
            userRoles: ['user'],
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('Super User Authorization', () => {
    it('should allow superuser access', async () => {
      mockRequest.user!.roles = ['superuser'];
      const superUserMiddleware = middleware.authorizeSuperUser();

      await superUserMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-superuser access', async () => {
      const superUserMiddleware = middleware.authorizeSuperUser();

      await superUserMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
          details: {
            requiredRoles: ['superuser'],
            userRoles: ['user'],
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('Risk-Based Authentication', () => {
    it('should allow low-risk access without MFA', async () => {
      mockRequest.user!.securityContext!.mfaEnabled = false;
      const riskMiddleware = middleware.authorizeWithRiskAssessment();

      await riskMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny high-risk access without MFA when MFA is required', async () => {
      // Mock high risk score
      const originalCalculateRiskScore = middleware['calculateRiskScore'];
      middleware['calculateRiskScore'] = jest.fn().mockResolvedValue(80);
      mockRequest.user!.securityContext!.mfaEnabled = false;

      const riskMiddleware = middleware.authorizeWithRiskAssessment({
        requireMFAForCritical: true
      });

      await riskMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MFA_REQUIRED',
          message: 'Multi-factor authentication required for high-risk access'
        }
      });

      // Restore original method
      middleware['calculateRiskScore'] = originalCalculateRiskScore;
    });

    it('should allow high-risk access with MFA', async () => {
      const originalCalculateRiskScore = middleware['calculateRiskScore'];
      middleware['calculateRiskScore'] = jest.fn().mockResolvedValue(80);
      mockRequest.user!.securityContext!.mfaEnabled = true;

      const riskMiddleware = middleware.authorizeWithRiskAssessment({
        requireMFAForCritical: true
      });

      await riskMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore original method
      middleware['calculateRiskScore'] = originalCalculateRiskScore;
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in role authorization', async () => {
      const roleMiddleware = middleware.authorizeRoles(['user']);

      // Mock an error in the authorization logic
      jest.spyOn(middleware as any, 'checkRoleAuthorization').mockRejectedValue(new Error('Test error'));

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    });

    it('should handle errors gracefully in permission authorization', async () => {
      const permissionMiddleware = middleware.authorizePermissions({
        resource: 'test',
        action: 'test'
      });

      // Mock an error in the authorization logic
      jest.spyOn(middleware as any, 'checkPermissionAuthorization').mockRejectedValue(new Error('Test error'));

      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Permission verification failed'
        }
      });
    });
  });

  describe('AuthorizationMiddlewareFactory', () => {
    it('should create role authorization middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createRoleAuth(['user']);
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create permission authorization middleware', () => {
      const permission = {
        resource: 'test',
        action: 'test'
      };
      const middleware = AuthorizationMiddlewareFactory.createPermissionAuth(permission);
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create resource ownership middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createResourceAuth('products', 'id');
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create admin authorization middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createAdminAuth();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create super user authorization middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createSuperUserAuth();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create risk-based authorization middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createRiskBasedAuth();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create combined authorization middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createCombinedAuth(
        ['user'],
        [{ resource: 'test', action: 'test', scope: 'public' }],
        'products'
      );
      expect(middleware).toBeDefined();
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBe(3);
    });

    it('should create secure authorization middleware', () => {
      const middleware = AuthorizationMiddlewareFactory.createSecureAuth();
      expect(middleware).toBeDefined();
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBe(2);
    });
  });

  describe('Caching', () => {
    it('should cache permission results', async () => {
      const permission = {
        resource: 'products',
        action: 'read',
        scope: 'public'
      };
      mockRequest.user!.permissions = ['products:read:public'];

      const permissionMiddleware = middleware.authorizePermissions(permission);

      // First call
      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Reset next function
      (mockNext as jest.Mock).mockClear();

      // Second call should use cache
      await permissionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should log authorization events', async () => {
      const roleMiddleware = middleware.authorizeRoles(['user']);

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Authorization event', expect.objectContaining({
        eventType: 'AUTHORIZATION_SUCCESS',
        userId: 'user-123',
        sessionId: 'session-123'
      }));
    });

    it('should log authorization failures', async () => {
      const roleMiddleware = middleware.authorizeRoles(['admin']);

      await roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Authorization event', expect.objectContaining({
        eventType: 'AUTHORIZATION_FAILURE',
        userId: 'user-123',
        sessionId: 'session-123'
      }));
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        ...DEFAULT_AUTHZ_CONFIG,
        enableAuditLogging: false,
        cacheExpirationTime: 1000
      };
      const customMiddleware = new AuthorizationMiddleware(customConfig);

      expect(customMiddleware['config'].enableAuditLogging).toBe(false);
      expect(customMiddleware['config'].cacheExpirationTime).toBe(1000);
    });

    it('should validate configuration', () => {
      const config = middleware['config'];
      expect(config).toBeDefined();
      expect(config.enableRBAC).toBe(true);
      expect(config.enableABAC).toBe(true);
    });
  });
});
