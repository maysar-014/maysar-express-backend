import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';

export interface UserContext {
    id: string;
    roles: string[];
}

export class AuthorizationMiddleware {
    /**
     * Ensures the user is authenticated and the userId in params matches their own ID, 
     * OR they have an admin role.
     */
    public static authorizeWalletAccess() {
        return (req: Request, _res: Response, next: NextFunction) => {
            const user = (req as any).user as UserContext;

            if (!user) {
                return next(createError.unauthorized('Authentication required'));
            }

            const requestedUserId = req.params.userId;

            // Admin can access everything
            if (user.roles.includes('ADMIN') || user.roles.includes('SUPPORT')) {
                return next();
            }

            // Users can only access their own wallet
            if (requestedUserId && user.id !== requestedUserId) {
                return next(createError.forbidden('You do not have permission to access this wallet'));
            }

            next();
        };
    }

    /**
     * Ensures the user has a specific role.
     */
    public static authorizeRole(roles: string[]) {
        return (req: Request, _res: Response, next: NextFunction) => {
            const user = (req as any).user as UserContext;

            if (!user) {
                return next(createError.unauthorized('Authentication required'));
            }

            const hasRole = roles.some(role => user.roles.includes(role));
            if (!hasRole) {
                return next(createError.forbidden('Insufficient permissions'));
            }

            next();
        };
    }
}
