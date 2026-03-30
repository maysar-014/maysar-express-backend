/**
 * Authorization Middleware Tests
 * Comprehensive testing of role-based and permission-based access control
 * Validates RBAC, ABAC, resource ownership, and security policies
 */

import { Response } from 'express';
import {
  authorize,
  authorizePermissions,
  authorizeResourceOwnership,
  authorizeAdmin,
  authorizeSuperUser,
  AuthorizationMiddlewareFactory,
  Permission,
  PermissionCondition,
  DEFAULT_AUTHZ_CONFIG,
  checkPermissionMatch,
  evaluateCondition,
  getNestedValue
} from '../authorization.middleware';

// Mock Express objects
const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res as Response;
};

const mockNext = jest.fn();
type GlobalAuthzMocks = typeof globalThis & {
  checkUserPermissions?: jest.Mock;
  checkResourceOwnership?: jest.Mock;
};
const globalAuthz = globalThis as GlobalAuthzMocks;

describe('Authorization Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalAuthz.checkUserPermissions = jest.fn();
    globalAuthz.checkResourceOwnership = jest.fn();
  });

  describe('authorize (Role-Based)', () => {
    it('should allow access when user has required role', async () => {
      const middleware = authorize('admin');
      const req = {
        user: {
          userId: 'user-123',
          roles: ['admin', 'user'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', async () => {
      const middleware = authorize(['admin', 'moderator']);
      const req = {
        user: {
          userId: 'user-123',
          roles: ['moderator', 'user'],
          email: 'mod@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when user has inherited role', async () => {
      const middleware = authorize('user', {
        roleHierarchy: {
          admin: ['user']
        }
      });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['admin'], // admin inherits user role
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', async () => {
      const middleware = authorize('admin');
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
          details: expect.objectContaining({
            requiredRoles: ['admin'],
            userRoles: ['user']
          })
        })
      });
    });

    it('should deny access when user is not authenticated', async () => {
      const middleware = authorize('admin');
      const req = {} as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHENTICATED'
        })
      });
    });

    it('should allow emergency access in emergency mode', async () => {
      const middleware = authorize('admin', { enableEmergencyMode: true });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['emergency'],
          email: 'emergency@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access during restricted time windows', async () => {
      const middleware = authorize('user', {
        enableTimeBasedAccess: true,
        allowedTimeWindows: {
          user: {
            days: [1, 2, 3, 4, 5], // Monday to Friday
            hours: [9, 17] // 9 AM to 5 PM
          }
        }
      });

      // Mock current time as Saturday (6) - outside allowed days
      const mockDate = new Date();
      mockDate.getDay = jest.fn(() => 6); // Saturday
      mockDate.getHours = jest.fn(() => 10);

      const originalDate = Date;
      global.Date = jest.fn(() => mockDate) as any;

      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'ACCESS_TIME_RESTRICTED'
        })
      });

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('authorizePermissions (Permission-Based)', () => {
    const mockPermission: Permission = {
      resource: 'products',
      action: 'create'
    };

    it('should allow access when user has required permission', async () => {
      // Mock the permission check to return true
      globalAuthz.checkUserPermissions = jest.fn().mockResolvedValue(true);

      const middleware = authorizePermissions(mockPermission);
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          permissions: [mockPermission],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when user has wildcard permission', async () => {
      // Mock checkUserPermissions to return true
      const originalCheckUserPermissions = globalAuthz.checkUserPermissions;
      globalAuthz.checkUserPermissions = jest.fn().mockResolvedValue(true);

      const middleware = authorizePermissions(mockPermission, { enablePermissionCaching: false });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          permissions: [{ resource: '*', action: '*' }],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore original function
      globalAuthz.checkUserPermissions = originalCheckUserPermissions;
    });

    it('should deny access when user lacks required permission', async () => {
      const middleware = authorizePermissions(mockPermission, { enablePermissionCaching: false });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          permissions: [{ resource: 'orders', action: 'create' }],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
          details: expect.objectContaining({
            requiredPermissions: [mockPermission],
            userPermissions: [{ resource: 'orders', action: 'create' }]
          })
        })
      });
    });

    it('should handle ABAC conditions', async () => {
      // Mock checkUserPermissions to return true
      const originalCheckUserPermissions = globalAuthz.checkUserPermissions;
      globalAuthz.checkUserPermissions = jest.fn().mockResolvedValue(true);

      const condition: PermissionCondition = {
        attribute: 'department',
        operator: 'eq',
        value: 'engineering'
      };

      const permissionWithCondition: Permission = {
        resource: 'products',
        action: 'create',
        conditions: [condition]
      };

      const middleware = authorizePermissions(permissionWithCondition, { enableABAC: true, enablePermissionCaching: false });

      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          permissions: [permissionWithCondition],
          department: 'engineering', // Matches condition
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore original function
      globalAuthz.checkUserPermissions = originalCheckUserPermissions;
    });

    it('should deny access when ABAC conditions are not met', async () => {
      const condition: PermissionCondition = {
        attribute: 'department',
        operator: 'eq',
        value: 'engineering'
      };

      const permissionWithCondition: Permission = {
        resource: 'products',
        action: 'create',
        conditions: [condition]
      };

      const middleware = authorizePermissions(permissionWithCondition, { enableABAC: true });

      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          permissions: [permissionWithCondition],
          department: 'marketing', // Does not match condition
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should support multiple permissions', async () => {
      // Mock checkUserPermissions to return true
      const originalCheckUserPermissions = globalAuthz.checkUserPermissions;
      globalAuthz.checkUserPermissions = jest.fn().mockResolvedValue(true);

      const permissions: Permission[] = [
        { resource: 'products', action: 'create' },
        { resource: 'products', action: 'update' }
      ];

      const middleware = authorizePermissions(permissions, { enablePermissionCaching: false });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          permissions: permissions,
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore original function
      globalAuthz.checkUserPermissions = originalCheckUserPermissions;
    });
  });

  describe('authorizeResourceOwnership', () => {
    it('should allow access when user owns the resource', async () => {
      // Ensure the global mock returns true for this test
      globalAuthz.checkResourceOwnership = jest.fn().mockReturnValue(true);

      const middleware = authorizeResourceOwnership('products', 'id', { enableResourceOwnership: true });
      const req = {
        params: { id: 'prod-123' },
        user: {
          userId: 'user-123',
          roles: ['user'], // Not admin, so ownership check should happen
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when user is admin', async () => {
      const middleware = authorizeResourceOwnership('products', 'id', { enableResourceOwnership: true });
      const req = {
        params: { id: 'prod-123' },
        user: {
          userId: 'user-123',
          roles: ['admin'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user does not own the resource', async () => {
      // Mock checkResourceOwnership to return false
      const originalCheckOwnership = globalAuthz.checkResourceOwnership;
      globalAuthz.checkResourceOwnership = jest.fn().mockReturnValue(false);

      const middleware = authorizeResourceOwnership('products', 'id', { enableResourceOwnership: true });
      const req = {
        params: { id: 'prod-123' },
        user: {
          userId: 'user-123',
          roles: ['user'], // Not admin
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'RESOURCE_ACCESS_DENIED'
        })
      });

      // Restore original function
      globalAuthz.checkResourceOwnership = originalCheckOwnership;
    });

    it('should deny access when resource ID parameter is missing', async () => {
      const middleware = authorizeResourceOwnership('products', 'id', { enableResourceOwnership: true });
      const req = {
        params: {},
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_RESOURCE_ID'
        })
      });
    });

    it('should skip ownership check when disabled', async () => {
      const middleware = authorizeResourceOwnership('products', 'id', {
        enableResourceOwnership: false
      });
      const req = {
        params: { id: 'prod-123' },
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorizeAdmin', () => {
    it('should allow access when user has admin role', async () => {
      const middleware = authorizeAdmin();
      const req = {
        user: {
          userId: 'user-123',
          roles: ['admin'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks admin role', async () => {
      const middleware = authorizeAdmin();
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('authorizeSuperUser', () => {
    it('should allow access when user has superuser role', async () => {
      const middleware = authorizeSuperUser();
      const req = {
        user: {
          userId: 'user-123',
          roles: ['superuser'],
          email: 'super@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks superuser role', async () => {
      const middleware = authorizeSuperUser();
      const req = {
        user: {
          userId: 'user-123',
          roles: ['admin'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('AuthorizationMiddlewareFactory', () => {
    describe('createRoleAuth', () => {
      it('should create role-based authorization middleware', () => {
        const middleware = AuthorizationMiddlewareFactory.createRoleAuth('admin');

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createPermissionAuth', () => {
      it('should create permission-based authorization middleware', () => {
        const permissions: Permission[] = [{ resource: 'products', action: 'create' }];
        const middleware = AuthorizationMiddlewareFactory.createPermissionAuth(permissions);

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createResourceAuth', () => {
      it('should create resource ownership authorization middleware', () => {
        const middleware = AuthorizationMiddlewareFactory.createResourceAuth('products', 'id');

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createAdminAuth', () => {
      it('should create admin authorization middleware', () => {
        const middleware = AuthorizationMiddlewareFactory.createAdminAuth();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createSuperUserAuth', () => {
      it('should create superuser authorization middleware', () => {
        const middleware = AuthorizationMiddlewareFactory.createSuperUserAuth();

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createCombinedAuth', () => {
      it('should create combined authorization middleware', () => {
        const roles = ['admin'];
        const permissions: Permission[] = [{ resource: 'products', action: 'create' }];
        const resourceType = 'products';

        const middlewares = AuthorizationMiddlewareFactory.createCombinedAuth(
          roles,
          permissions,
          resourceType
        );

        expect(Array.isArray(middlewares)).toBe(true);
        expect(middlewares.length).toBe(3); // role + permission + resource
        middlewares.forEach(middleware => {
          expect(typeof middleware).toBe('function');
        });
      });

      it('should create minimal combined auth with only roles', () => {
        const roles = ['admin'];

        const middlewares = AuthorizationMiddlewareFactory.createCombinedAuth(roles);

        expect(Array.isArray(middlewares)).toBe(true);
        expect(middlewares.length).toBe(1);
      });
    });
  });

  describe('Permission Evaluation Logic', () => {
    describe('checkPermissionMatch', () => {
      it('should match exact permissions', () => {
        const userPerm: Permission = { resource: 'products', action: 'create' };
        const requiredPerm: Permission = { resource: 'products', action: 'create' };
        const user = { userId: 'user-123' };

        const result = checkPermissionMatch(userPerm, requiredPerm, user, {
          ...DEFAULT_AUTHZ_CONFIG,
          enableABAC: false
        });

        expect(result).toBe(true);
      });

      it('should match wildcard permissions', () => {
        const userPerm: Permission = { resource: '*', action: '*' };
        const requiredPerm: Permission = { resource: 'products', action: 'create' };
        const user = { userId: 'user-123' };

        const result = checkPermissionMatch(userPerm, requiredPerm, user, {
          ...DEFAULT_AUTHZ_CONFIG,
          enableABAC: false
        });

        expect(result).toBe(true);
      });

      it('should respect scope matching', () => {
        const userPerm: Permission = { resource: 'products', action: 'create', scope: 'own' };
        const requiredPerm: Permission = { resource: 'products', action: 'create', scope: 'own' };
        const user = { userId: 'user-123' };

        const result = checkPermissionMatch(userPerm, requiredPerm, user, {
          ...DEFAULT_AUTHZ_CONFIG,
          enableABAC: false
        });

        expect(result).toBe(true);
      });

      it('should reject mismatched permissions', () => {
        const userPerm: Permission = { resource: 'products', action: 'create' };
        const requiredPerm: Permission = { resource: 'orders', action: 'create' };
        const user = { userId: 'user-123' };

        const result = checkPermissionMatch(userPerm, requiredPerm, user, {
          ...DEFAULT_AUTHZ_CONFIG,
          enableABAC: false
        });

        expect(result).toBe(false);
      });
    });

    describe('evaluateCondition', () => {
      it('should evaluate equality conditions', () => {
        const condition: PermissionCondition = {
          attribute: 'department',
          operator: 'eq',
          value: 'engineering'
        };
        const user = { department: 'engineering' };

        const result = evaluateCondition(condition, user);

        expect(result).toBe(true);
      });

      it('should evaluate inequality conditions', () => {
        const condition: PermissionCondition = {
          attribute: 'department',
          operator: 'ne',
          value: 'marketing'
        };
        const user = { department: 'engineering' };

        const result = evaluateCondition(condition, user);

        expect(result).toBe(true);
      });

      it('should evaluate array membership conditions', () => {
        const condition: PermissionCondition = {
          attribute: 'clearanceLevel',
          operator: 'in',
          value: ['secret', 'top-secret']
        };
        const user = { clearanceLevel: 'top-secret' };

        const result = evaluateCondition(condition, user);

        expect(result).toBe(true);
      });

      it('should evaluate regex conditions', () => {
        const condition: PermissionCondition = {
          attribute: 'email',
          operator: 'regex',
          value: '@company\\.com$'
        };
        const user = { email: 'user@company.com' };

        const result = evaluateCondition(condition, user);

        expect(result).toBe(true);
      });

      it('should evaluate nested attribute conditions', () => {
        const condition: PermissionCondition = {
          attribute: 'profile.level',
          operator: 'gte',
          value: 3
        };
        const user = { profile: { level: 5 } };

        const result = evaluateCondition(condition, user);

        expect(result).toBe(true);
      });
    });

    describe('getNestedValue', () => {
      it('should retrieve nested object values', () => {
        const obj = { user: { profile: { level: 5 } } };
        const path = 'user.profile.level';

        const result = getNestedValue(obj, path);

        expect(result).toBe(5);
      });

      it('should return undefined for non-existent paths', () => {
        const obj = { user: { profile: { level: 5 } } };
        const path = 'user.settings.theme';

        const result = getNestedValue(obj, path);

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Configuration Handling', () => {
    it('should use default configuration values', async () => {
      const middleware = authorize('admin');
      const req = {
        user: {
          userId: 'user-123',
          roles: ['admin'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should merge custom configuration with defaults', async () => {
      const middleware = authorize('super-admin', {
        enableRBAC: false,
        adminRoles: ['super-admin']
      });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['super-admin'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle authorization service failures gracefully', async () => {
      const middleware = authorizePermissions({ resource: 'products', action: 'create' }, { enablePermissionCaching: false });
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      // Mock permission check to throw error
      const originalCheckUserPermissions = globalAuthz.checkUserPermissions;
      globalAuthz.checkUserPermissions = jest.fn().mockRejectedValue(new Error('Database error'));

      await middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'PERMISSION_CHECK_ERROR'
        })
      });

      // Restore original function
      globalAuthz.checkUserPermissions = originalCheckUserPermissions;
    });

    it('should provide detailed error information', async () => {
      const middleware = authorize('nonexistent-role');
      const req = {
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: expect.any(String),
          details: expect.objectContaining({
            requiredRoles: ['nonexistent-role'],
            userRoles: ['user']
          })
        })
      });
    });
  });

  describe('Security Features', () => {
    it('should implement proper audit logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const middleware = authorize('admin');
      const req = {
        ip: '127.0.0.1',
        method: 'POST',
        originalUrl: '/api/products',
        user: {
          userId: 'user-123',
          roles: ['admin'],
          email: 'admin@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AUTHZ] SUCCESS role_authorized:',
        expect.objectContaining({
          userId: 'user-123',
          ip: '127.0.0.1',
          method: 'POST',
          url: '/api/products',
          timestamp: expect.any(String),
          requiredRoles: ['admin']
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log authorization failures', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const middleware = authorize('admin');
      const req = {
        ip: '127.0.0.1',
        method: 'POST',
        originalUrl: '/api/products',
        user: {
          userId: 'user-123',
          roles: ['user'],
          email: 'user@test.com'
        }
      } as any;
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[AUTHZ] FAILURE insufficient_roles:',
        expect.objectContaining({
          userId: 'user-123',
          requiredRoles: ['admin']
        })
      );

      consoleSpy.mockRestore();
    });

    it('should prevent timing attacks with consistent response times', async () => {
      // This test verifies that authorization decisions don't leak timing information
      const middleware1 = authorize('admin');
      const middleware2 = authorize('nonexistent-role');

      const req1 = {
        user: { userId: 'user-123', roles: ['admin'], email: 'admin@test.com' }
      } as any;
      const req2 = {
        user: { userId: 'user-123', roles: ['user'], email: 'user@test.com' }
      } as any;

      const res1 = mockResponse();
      const res2 = mockResponse();

      const start1 = Date.now();
      await middleware1(req1, res1, mockNext);
      const end1 = Date.now();

      const start2 = Date.now();
      await middleware2(req2, res2, mockNext);
      const end2 = Date.now();

      // Response times should be reasonably similar (within 10ms tolerance)
      const timeDiff = Math.abs((end1 - start1) - (end2 - start2));
      expect(timeDiff).toBeLessThan(10);
    });
  });
});
