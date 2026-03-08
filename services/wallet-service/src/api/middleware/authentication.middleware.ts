import { Request, Response, NextFunction } from 'express';

/**
 * Mock Authentication Middleware
 * In a real-world scenario, this would verify a JWT or session
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    // For now, we'll try to get user from headers or mock it if not present
    // This allows testing without a full auth integration
    const userIdHeader = req.headers['x-user-id'];
    const userRolesHeader = req.headers['x-user-roles'];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
    const userRolesValue = Array.isArray(userRolesHeader) ? userRolesHeader[0] : userRolesHeader;
    const userRoles = (userRolesValue || 'USER').split(',');
    const now = Date.now();
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : (userAgentHeader || 'unknown');
    const deviceIdHeader = req.headers['x-device-id'];
    const deviceId = Array.isArray(deviceIdHeader) ? deviceIdHeader[0] : (deviceIdHeader || 'unknown-device');

    const buildUserContext = (resolvedUserId: string, roles: string[]) => ({
        userId: resolvedUserId,
        email: `${resolvedUserId}@local.wallet`,
        roles,
        permissions: [],
        sessionId: `session-${resolvedUserId}`,
        deviceId,
        ipAddress: req.ip || '127.0.0.1',
        userAgent,
        issuedAt: now,
        expiresAt: now + (15 * 60 * 1000)
    });

    if (userId) {
        req.user = buildUserContext(userId, userRoles);
    } else {
        // Default mock user for development
        req.user = buildUserContext('mock-user-id', ['USER']);
    }

    next();
};
