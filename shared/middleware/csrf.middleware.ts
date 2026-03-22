import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf-token';

const getCookieFromHeader = (cookieHeader: string | undefined, name: string): string | undefined => {
    if (!cookieHeader) return undefined;
    const parts = cookieHeader.split(';').map((part) => part.trim()).filter(Boolean);
    const match = parts.find((part) => part.startsWith(`${name}=`));
    if (!match) return undefined;
    return decodeURIComponent(match.slice(name.length + 1));
};

const getCookieToken = (req: Request): string | undefined => {
    const cookieValue = req.cookies && req.cookies[CSRF_COOKIE_NAME];
    if (typeof cookieValue === 'string' && cookieValue.length > 0) {
        return cookieValue;
    }

    const headerCookie = req.headers.cookie;
    const rawCookie = Array.isArray(headerCookie)
        ? headerCookie.join('; ')
        : typeof headerCookie === 'string'
            ? headerCookie
            : typeof req.get === 'function'
                ? req.get('cookie') || undefined
                : undefined;

    return getCookieFromHeader(rawCookie, CSRF_COOKIE_NAME);
};

const setCsrfCookie = (res: Response, token: string) => {
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });
};

export const getOrCreateCsrfToken = (req: Request, res: Response): string => {
    const existingToken = getCookieToken(req);
    if (existingToken) {
        return existingToken;
    }

    const token = crypto.randomBytes(32).toString('hex');
    setCsrfCookie(res, token);
    return token;
};

/**
 * Middleware to generate and set CSRF token cookie
 */
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const existingToken = getCookieToken(req);

    // Set cookie if missing, usually triggered on the first GET request to the frontend/API
    if (!existingToken && ['GET', 'HEAD'].includes(req.method)) {
        const token = crypto.randomBytes(32).toString('hex');
        setCsrfCookie(res, token);
    }

    next();
};

/**
 * Middleware to validate CSRF token on state-changing requests (POST, PUT, DELETE, PATCH)
 */
export const csrfValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const cookieToken = getCookieToken(req);
    const headerValue = req.headers['x-csrf-token'];
    const headerTokenRaw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const headerToken = headerTokenRaw || (typeof req.get === 'function' ? req.get('x-csrf-token') || req.get('X-CSRF-Token') : undefined);

    const testBypassHeader =
        req.headers['x-test-csrf'] ||
        req.headers['x-csrf-bypass'] ||
        req.headers['x-contract-test'];
    const testBypass = Array.isArray(testBypassHeader)
        ? testBypassHeader[0] === '1'
        : testBypassHeader === '1';

    // Allow full CSRF bypass for automated tests in non-production
    if (process.env.NODE_ENV !== 'production' && testBypass) {
        next();
        return;
    }

    if (!cookieToken && headerToken && (process.env.CSRF_ALLOW_HEADER_ONLY === '1' || (process.env.NODE_ENV !== 'production' && testBypass))) {
        next();
        return;
    }

    if (!cookieToken || !headerToken) {
        if (process.env.CSRF_DEBUG === '1') {
            const cookieHeader = req.headers.cookie;
            const rawCookie = Array.isArray(cookieHeader)
                ? cookieHeader.join('; ')
                : typeof cookieHeader === 'string'
                    ? cookieHeader
                    : undefined;

            // Log presence and lengths only to avoid leaking tokens in logs.
            console.warn('[csrf] missing token', {
                method: req.method,
                path: req.originalUrl || req.url,
                hasCookieToken: Boolean(cookieToken),
                hasHeaderToken: Boolean(headerToken),
                cookieHeaderPresent: Boolean(rawCookie),
                cookieHeaderLength: rawCookie ? rawCookie.length : 0,
                headerTokenLength: typeof headerToken === 'string' ? headerToken.length : 0,
                testBypass
            });
        }
        res.status(403).json({
            success: false,
            message: 'CSRF token missing'
        });
        return;
    }

    if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
        res.status(403).json({
            success: false,
            message: 'Invalid CSRF token format'
        });
        return;
    }

    if (cookieToken.length !== headerToken.length) {
        res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
        return;
    }

    try {
        const isMatch = crypto.timingSafeEqual(
            Buffer.from(cookieToken),
            Buffer.from(headerToken)
        );

        if (!isMatch) {
            res.status(403).json({
                success: false,
                message: 'CSRF token mismatch'
            });
            return;
        }

        next();
    } catch (err) {
        res.status(403).json({
            success: false,
            message: 'Invalid CSRF token'
        });
    }
};
