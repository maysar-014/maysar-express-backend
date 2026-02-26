import { Request, Response, NextFunction } from 'express';
import { requestLogger } from '../request-logger.middleware';
import { logger } from '../../../infrastructure/services/logger.service';

jest.mock('../../../infrastructure/services/logger.service');

describe('requestLogger', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let finishCallback: () => void;

    beforeEach(() => {
        req = { method: 'POST', originalUrl: '/api/test' };
        res = { on: jest.fn((event, cb) => { if (event === 'finish') finishCallback = cb; }) };
        next = jest.fn();
        jest.clearAllMocks();
    });

    it('should call next immediately', () => {
        requestLogger(req as Request, res as Response, next);
        expect(next).toHaveBeenCalled();
    });

    it('should log request on response finish', () => {
        (res as any).statusCode = 200;
        requestLogger(req as Request, res as Response, next);
        
        finishCallback();

        expect(logger.logRequest).toHaveBeenCalledWith('POST', '/api/test', 200, expect.any(Number), undefined);
    });

    it('should log userId if present', () => {
        (req as any).user = { id: 'user-456' };
        (res as any).statusCode = 201;
        requestLogger(req as Request, res as Response, next);
        
        finishCallback();

        expect(logger.logRequest).toHaveBeenCalledWith('POST', '/api/test', 201, expect.any(Number), 'user-456');
    });

    it('should fallback to req.url if originalUrl missing', () => {
        req.originalUrl = undefined;
        req.url = '/fallback';
        (res as any).statusCode = 404;
        requestLogger(req as Request, res as Response, next);
        
        finishCallback();

        expect(logger.logRequest).toHaveBeenCalledWith('POST', '/fallback', 404, expect.any(Number), undefined);
    });
});
