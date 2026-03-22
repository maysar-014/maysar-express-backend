import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';
import { logger } from '../../infrastructure/services/logger.service';

interface ValidatableSchema {
    validate(value: unknown, options?: Record<string, unknown>): {
        error?: { details: Array<{ message: string }> };
        value: unknown;
    };
}

interface ValidationSchemaSections {
    params?: ValidatableSchema;
    query?: ValidatableSchema;
    body?: ValidatableSchema;
}

const isSectionedSchema = (schema: ValidatableSchema | ValidationSchemaSections): schema is ValidationSchemaSections =>
    typeof schema === 'object'
    && schema !== null
    && !('validate' in schema);

const normalizeBody = (body: unknown) =>
    body && typeof body === 'object' && !Array.isArray(body)
        ? body
        : {};

const validateSection = (
    schema: ValidatableSchema | undefined,
    value: unknown
): { error?: { details: Array<{ message: string }> }; value: unknown } => {
    if (!schema) {
        return { value };
    }

    return schema.validate(value, {
        abortEarly: false,
        stripUnknown: false,
        convert: true
    });
};

const logValidationFailure = (req: Request, errors: Array<{ message: string }>) => {
    logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        errors: errors.map((d) => d.message)
    });
};

export const validateRequest = (schema: ValidatableSchema | ValidationSchemaSections) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            if (isSectionedSchema(schema)) {
                const paramsResult = validateSection(schema.params, req.params);
                if (paramsResult.error) {
                    logValidationFailure(req, paramsResult.error.details);
                    return next(createError.badRequest('Validation failed'));
                }

                const queryResult = validateSection(schema.query, req.query);
                if (queryResult.error) {
                    logValidationFailure(req, queryResult.error.details);
                    return next(createError.badRequest('Validation failed'));
                }

                const bodyResult = validateSection(schema.body, normalizeBody(req.body));
                if (bodyResult.error) {
                    logValidationFailure(req, bodyResult.error.details);
                    return next(createError.badRequest('Validation failed'));
                }

                if (schema.params) req.params = paramsResult.value as Request['params'];
                if (schema.query) req.query = queryResult.value as Request['query'];
                if (schema.body) req.body = bodyResult.value;
                next();
                return;
            }

            const payload = {
                ...req.params,
                ...req.query,
                ...normalizeBody(req.body)
            };

            const { error, value } = schema.validate(payload, {
                abortEarly: false,
                stripUnknown: false,
                convert: true
            });

            if (error) {
                logValidationFailure(req, error.details);
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
