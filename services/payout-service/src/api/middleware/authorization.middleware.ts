import { Request, Response, NextFunction } from 'express';

/**
 * Authorization Middleware for Payout Service
 * Enforces role-based access control
 */
export class AuthorizationMiddleware {
    /**
     * Authorize roles for payout access
     * @param allowedRoles Array of roles eligible for the operation
     */
    static authorizeRoles(allowedRoles: string[]) {
        return (req: Request, res: Response, next: NextFunction) => {
            const user = (req as any).user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authentication required'
                    }
                });
            }

            const userRoles: string[] = Array.isArray(user.roles)
                ? user.roles.map((role: string) => role.toLowerCase())
                : user.role
                    ? [String(user.role).toLowerCase()]
                    : [];
            const isAuthorized = allowedRoles.some(role => userRoles.includes(role.toLowerCase()));

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Role ${user.role || user.roles} is not authorized for this operation`,
                        details: {
                            requiredRoles: allowedRoles,
                            userRole: user.role || user.roles
                        }
                    }
                });
            }

            next();
        };
    }
}

/**
 * Backward-compatible alias for older tests and callers.
 */
export const authorizationMiddleware = AuthorizationMiddleware.authorizeRoles;
