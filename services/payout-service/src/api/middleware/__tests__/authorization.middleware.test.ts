import { authorizationMiddleware } from '../authorization.middleware';
import { Request, Response, NextFunction } from 'express';

describe('authorizationMiddleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = { headers: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
    });

    it('should allow authorized request', () => {
        req.headers = { authorization: 'Bearer valid-token' };
        (req as any).user = { id: 'u1', role: 'admin' };

        authorizationMiddleware(['admin'])(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
    });

    it('should reject unauthorized request', () => {
        authorizationMiddleware(['admin'])(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject insufficient permissions', () => {
        (req as any).user = { id: 'u1', role: 'user' };

        authorizationMiddleware(['admin'])(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});
