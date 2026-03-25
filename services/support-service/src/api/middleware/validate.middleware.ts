import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

const withStrictObject = (schema: ZodTypeAny): ZodTypeAny =>
    typeof (schema as ZodTypeAny & { strict?: () => ZodTypeAny }).strict === 'function'
        ? (schema as ZodTypeAny & { strict: () => ZodTypeAny }).strict()
        : schema;

export const validate = (schema: ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await withStrictObject(schema).parseAsync(req.body);
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                }
            });
        }
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const validateQuery = (schema: ZodTypeAny) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.query = await withStrictObject(schema).parseAsync(req.query);
        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Query validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                }
            });
        }
        return res.status(400).json({ success: false, error: 'Invalid query parameters' });
    }
};
