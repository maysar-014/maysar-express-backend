import { errorMiddleware } from '../error.middleware';
import { Request, Response, NextFunction } from 'express';

describe('errorMiddleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {};
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
    });

    it('should handle errors', () => {
        const err = new Error('Test error');
        errorMiddleware(err, req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
