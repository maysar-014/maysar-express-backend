/**
 * Request Validation Middleware
 * adapted for Campaign Service
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    source: 'body' | 'query' | 'params' = 'body'
) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[source];
            const parser = typeof (schema as z.ZodSchema<T> & { strict?: () => z.ZodSchema<T> }).strict === 'function'
                ? (schema as z.ZodSchema<T> & { strict: () => z.ZodSchema<T> }).strict()
                : schema;
            const validatedData = parser.parse(data);
            req[source] = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Request validation failed',
                        details: error.issues.map((err) => ({
                            field: err.path.join('.'),
                            message: err.message
                        }))
                    }
                });
            }
            next(error);
        }
    };
}
