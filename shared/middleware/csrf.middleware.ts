import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware to generate and set CSRF token cookie
 */
export const csrfTokenMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const existingToken = req.cookies && req.cookies['csrf-token'];

    // Set cookie if missing, usually triggered on the first GET request to the frontend/API
    if (!existingToken && ['GET', 'HEAD'].includes(req.method)) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('csrf-token', token, {
            httpOnly: false, // Intentional so frontend JS can read it for the X-CSRF-Token header
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });
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

    const cookieToken = req.cookies && req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken) {
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
