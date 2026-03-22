import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '@shared/middleware/auth-context.middleware';

type WalletRequestUser = {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    sessionId: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
    issuedAt: number;
    expiresAt: number;
};

const getHeaderValue = (value: string | string[] | undefined, fallback = ''): string => {
    if (Array.isArray(value)) {
        return typeof value[0] === 'string' ? value[0] : fallback;
    }
    return typeof value === 'string' ? value : fallback;
};

const buildWalletUser = (req: Request, userId: string, roles: string[], email?: string): WalletRequestUser => {
    const now = Date.now();
    const userAgent = getHeaderValue(req.headers['user-agent'], 'unknown');
    const deviceId = getHeaderValue(req.headers['x-device-id'], 'unknown-device');

    return {
        userId,
        email: email || `${userId}@local.wallet`,
        roles: roles.length ? roles : ['USER'],
        permissions: [],
        sessionId: `session-${userId}`,
        deviceId,
        ipAddress: req.ip || '127.0.0.1',
        userAgent,
        issuedAt: now,
        expiresAt: now + (15 * 60 * 1000)
    };
};

const normalizeExistingUser = (req: Request): WalletRequestUser | null => {
    const existingUser = req.user as Record<string, unknown> | undefined;
    if (!existingUser) {
        return null;
    }

    const resolvedUserId = typeof existingUser.userId === 'string'
        ? existingUser.userId
        : typeof existingUser.id === 'string'
            ? existingUser.id
            : '';

    if (!resolvedUserId) {
        return null;
    }

    const roles = Array.isArray(existingUser.roles)
        ? existingUser.roles.map(role => String(role)).filter(Boolean)
        : typeof existingUser.role === 'string'
            ? [existingUser.role]
            : [];

    const email = typeof existingUser.email === 'string' ? existingUser.email : undefined;

    return buildWalletUser(req, resolvedUserId, roles, email);
};

/**
 * Authentication Middleware
 * Requires a resolved user context from upstream auth (e.g., gateway/JWT service).
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const normalizedUser = normalizeExistingUser(req);
    if (normalizedUser) {
        req.user = normalizedUser as any;
        next();
        return;
    }

    const userId = getHeaderValue(req.headers['x-user-id']);
    const userRoles = getHeaderValue(req.headers['x-user-roles'])
        .split(',')
        .map(role => role.trim())
        .filter(Boolean);

    if (userId) {
        req.user = buildWalletUser(req, userId, userRoles) as any;
        next();
        return;
    }

    requireAuth(req, res, () => {
        const resolvedUser = normalizeExistingUser(req);
        if (resolvedUser) {
            req.user = resolvedUser as any;
            next();
            return;
        }

        res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Missing authenticated user context.'
        });
    });
};
