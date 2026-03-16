import { Request, Response, NextFunction } from 'express';

/**
 * Authentication Middleware
 * Requires a resolved user context from upstream auth (e.g., gateway/JWT service).
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const userIdHeader = req.headers['x-user-id'];
    const userRolesHeader = req.headers['x-user-roles'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
    const userRolesValue = Array.isArray(userRolesHeader) ? userRolesHeader[0] : userRolesHeader;
    const userRoles = (userRolesValue || '').split(',').filter(Boolean);

    if (!userId) {
        res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Missing authenticated user context (x-user-id).'
        });
        return;
    }

    const now = Date.now();
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : (userAgentHeader || 'unknown');
    const deviceIdHeader = req.headers['x-device-id'];
    const deviceId = Array.isArray(deviceIdHeader) ? deviceIdHeader[0] : (deviceIdHeader || 'unknown-device');

    req.user = {
        userId,
        email: `${userId}@local.wallet`,
        roles: userRoles.length ? userRoles : ['USER'],
        permissions: [],
        sessionId: `session-${userId}`,
        deviceId,
        ipAddress: req.ip || '127.0.0.1',
        userAgent,
        issuedAt: now,
        expiresAt: now + (15 * 60 * 1000)
    };

    next();
};
