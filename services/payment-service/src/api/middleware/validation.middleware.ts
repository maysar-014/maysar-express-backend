import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type ZodSchema = z.ZodTypeAny;

interface ValidationSchemaSections {
    params?: ZodSchema;
    query?: ZodSchema;
    body?: ZodSchema;
}

const isSectionedSchema = (schema: ZodSchema | ValidationSchemaSections): schema is ValidationSchemaSections =>
    typeof schema === 'object'
    && schema !== null
    && !('safeParse' in schema);

const normalizeBody = (body: unknown) =>
    body === undefined ? {} : body;

const sendValidationError = (res: Response, error: z.ZodError) => {
    res.status(400).json({
        success: false,
        error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        }
    });
};

const validateSection = (schema: ZodSchema, value: unknown) => schema.safeParse(value);

export const validateRequest = (schema: ZodSchema | ValidationSchemaSections) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (isSectionedSchema(schema)) {
                if (schema.params) {
                    const result = validateSection(schema.params, req.params);
                    if (!result.success) {
                        sendValidationError(res, result.error);
                        return;
                    }
                    req.params = result.data as Request['params'];
                }

                if (schema.query) {
                    const result = validateSection(schema.query, req.query);
                    if (!result.success) {
                        sendValidationError(res, result.error);
                        return;
                    }
                    req.query = result.data as Request['query'];
                }

                if (schema.body) {
                    const result = validateSection(schema.body, normalizeBody(req.body));
                    if (!result.success) {
                        sendValidationError(res, result.error);
                        return;
                    }
                    req.body = result.data;
                }

                next();
                return;
            }

            const result = validateSection(schema, normalizeBody(req.body));
            if (!result.success) {
                sendValidationError(res, result.error);
                return;
            }

            req.body = result.data;
            next();
        } catch (error) {
            next(error);
        }
    };
};
