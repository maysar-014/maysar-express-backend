import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';
import { createPrismaClient } from '@shared/database/prisma-client';

const prisma = createPrismaClient();

export interface UserContext {
    userId: string;
    roles: string[];
}

export class AuthorizationMiddleware {
    /**
     * Ensures the user is authenticated and the userId in params matches their own ID,
     * OR the wallet's DB owner matches their JWT userId,
     * OR they have an admin/support role.
     */
    public static authorizeWalletAccess() {
        return async (req: Request, _res: Response, next: NextFunction) => {
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

            // Direct match: JWT userId matches URL userId
            if (!requestedUserId || user.userId === requestedUserId) {
                return next();
            }

            // Secondary check: the wallet at requestedUserId is actually owned by the JWT user.
            // This handles cases where the seeded/hardcoded URL userId differs from the
            // user-service-assigned JWT userId (different ID namespaces between services).
            try {
                const wallet = await prisma.wallet_Wallet.findFirst({
                    where: { userId: requestedUserId },
                    select: { userId: true }
                });
                if (wallet && wallet.userId === user.userId) {
                    return next();
                }
                // Also try: maybe the wallet is keyed to req.user.userId and the URL param is an alias
                const ownWallet = await prisma.wallet_Wallet.findFirst({
                    where: { userId: user.userId },
                    select: { userId: true }
                });
                if (ownWallet && ownWallet.userId === requestedUserId) {
                    return next();
                }
            } catch {
                // DB lookup failed — fall through to deny
            }

            return next(createError.forbidden('You do not have permission to access this wallet'));
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
