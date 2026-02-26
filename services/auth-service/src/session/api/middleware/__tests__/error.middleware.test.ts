import { Request, Response, NextFunction } from 'express';
import { errorHandler, validationErrorHandler } from '../error.middleware';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('errorHandler', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = { originalUrl: '/test', method: 'GET' };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should handle error with default 500 status', () => {
        const err = new Error('Test error');
        errorHandler(err, req as Request, res as Response, next);

        expect(logger.error).toHaveBeenCalledWith('Test error', expect.objectContaining({
            status: 500,
            url: '/test',
            method: 'GET'
        }));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            error: expect.objectContaining({
                message: 'Test error',
                status: 500,
                path: '/test'
            })
        });
    });

    it('should handle error with custom status', () => {
        const err: any = { message: 'Not found', status: 404 };
        errorHandler(err, req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            error: expect.objectContaining({ status: 404, message: 'Not found' })
        });
    });

    it('should log userId if present', () => {
        (req as any).user = { id: 'user-123' };
        const err = new Error('Auth error');
        errorHandler(err, req as Request, res as Response, next);

        expect(logger.error).toHaveBeenCalledWith('Auth error', expect.objectContaining({ userId: 'user-123' }));
    });
});

describe('validationErrorHandler', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {};
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
    });

    it('should handle ValidationError', () => {
        const err = { name: 'ValidationError', details: ['field required'] };
        validationErrorHandler(err, req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: expect.objectContaining({
                message: 'Validation Failed',
                details: ['field required']
            })
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should pass non-validation errors to next', () => {
        const err = new Error('Other error');
        validationErrorHandler(err, req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(err);
        expect(res.status).not.toHaveBeenCalled();
    });
});
