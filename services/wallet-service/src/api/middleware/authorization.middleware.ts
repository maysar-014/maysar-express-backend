import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';

export interface UserContext {
    userId: string;
    roles: string[];
}

export class AuthorizationMiddleware {
    /**
     * Ensures the user is authenticated and the userId in params matches their own ID, 
     * OR they have an admin role.
     */
    public static authorizeWalletAccess() {
        return (req: Request, _res: Response, next: NextFunction) => {
            const user = req.user as UserContext | undefined;

            if (!user) {
                return next(createError.unauthorized('Authentication required'));
            }

            const requestedUserId = req.params.userId;

            // Admin/Support can access everything
            const normalizedUserRoles = (user.roles || []).map(role => role.toLowerCase());
            if (normalizedUserRoles.includes('admin') || normalizedUserRoles.includes('support')) {
                return next();
            }

            // Exclude supplier and system roles from wallet access (business rule)
            const excludedRoles = ['supplier', 'system'];
            const hasExcludedRole = excludedRoles.some(role => normalizedUserRoles.includes(role));
            if (hasExcludedRole) {
                return next(createError.forbidden('Supplier and System roles do not have wallet access'));
            }

            // Users can only access their own wallet
            if (requestedUserId && user.userId !== requestedUserId) {
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
            const user = req.user as UserContext | undefined;

            if (!user) {
                return next(createError.unauthorized('Authentication required'));
            }

            // Normalize role casing for comparison (handles BUYER, buyer, Buyer etc.)
            const normalizedAllowedRoles = roles.map(role => role.toLowerCase());
            const normalizedUserRoles = (user.roles || []).map(role => role.toLowerCase());

            const hasRole = normalizedAllowedRoles.some(role => normalizedUserRoles.includes(role));
            if (!hasRole) {
                return next(createError.forbidden('Insufficient permissions'));
            }

            next();
        };
    }
}
