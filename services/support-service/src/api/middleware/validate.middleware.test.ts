import { z } from 'zod';
import { validate, validateQuery } from './validate.middleware';

const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('validate.middleware', () => {
    it('validate calls next for valid request body', async () => {
        const middleware = validate(z.object({ userId: z.string().uuid() }));
        const req: any = { body: { userId: '11111111-1111-4111-8111-111111111111' } };
        const res = makeRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('validate returns 400 for zod body errors', async () => {
        const middleware = validate(z.object({ amount: z.number().positive() }));
        const req: any = { body: { amount: -2 } };
        const res = makeRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed'
                })
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('validate returns 500 for unexpected parser errors', async () => {
        const middleware = validate({
            parseAsync: jest.fn().mockRejectedValue(new Error('unexpected failure'))
        } as any);
        const req: any = { body: { anything: true } };
        const res = makeRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' });
        expect(next).not.toHaveBeenCalled();
    });

    it('validateQuery handles success, validation error, and fallback error', async () => {
        const good = validateQuery(z.object({ page: z.coerce.number().min(1) }));
        const goodReq: any = { query: { page: '2' } };
        const goodRes = makeRes();
        const goodNext = jest.fn();
        await good(goodReq, goodRes, goodNext);
        expect(goodNext).toHaveBeenCalledTimes(1);

        const invalid = validateQuery(z.object({ page: z.coerce.number().min(1) }));
        const badReq: any = { query: { page: '0' } };
        const badRes = makeRes();
        const badNext = jest.fn();
        await invalid(badReq, badRes, badNext);
        expect(badRes.status).toHaveBeenCalledWith(400);
        expect(badRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                error: expect.objectContaining({ message: 'Query validation failed' })
            })
        );
        expect(badNext).not.toHaveBeenCalled();

        const unexpected = validateQuery({
            parseAsync: jest.fn().mockRejectedValue(new Error('boom'))
        } as any);
        const errorReq: any = { query: { page: '2' } };
        const errorRes = makeRes();
        const errorNext = jest.fn();
        await unexpected(errorReq, errorRes, errorNext);
        expect(errorRes.status).toHaveBeenCalledWith(400);
        expect(errorRes.json).toHaveBeenCalledWith({ success: false, error: 'Invalid query parameters' });
        expect(errorNext).not.toHaveBeenCalled();
    });
});

