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

            const userRole = user.role ? user.role.toLowerCase() : '';
            const isAuthorized = allowedRoles.some(role => role.toLowerCase() === userRole);

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: `Role ${user.role} is not authorized for this operation`,
                        details: {
                            requiredRoles: allowedRoles,
                            userRole: user.role
                        }
                    }
                });
            }

            next();
        };
    }
}
