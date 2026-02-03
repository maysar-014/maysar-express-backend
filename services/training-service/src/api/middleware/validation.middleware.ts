import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../domain/errors/domain.error';

export type ValidationSource = 'body' | 'params' | 'query';

export function validationMiddleware(
    validator: (data: any) => { valid: boolean; errors?: string[] },
    source: ValidationSource = 'body'
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = validator(req[source]);
        if (!result.valid) {
            next(new ValidationError(result.errors || ['Validation failed']));
            return;
        }
        next();
    };
}
