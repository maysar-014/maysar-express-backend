import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';
import { logger } from '../../infrastructure/services/logger.service';

export const validateRequest = (schema: any) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            const { error, value } = schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
                convert: true
            });

            if (error) {
                logger.warn('Request validation failed', {
                    path: req.path,
                    method: req.method,
                    errors: error.details.map((d: any) => d.message)
                });

                return next(createError.badRequest('Validation failed'));
            }

            req.body = value;
            next();
        } catch (err) {
            logger.error('Validation middleware error', { error: err });
            next(createError.internalServerError('Validation processing failed'));
        }
    };
};
