import { Request, Response } from 'express';
import { UserController } from '../user.controller';

/**
 * Helper to construct a UserController with all the no-op use cases the
 * constructor requires, plus an injectable `resolveNamesUseCase`.
 */
function makeController(resolveNamesUseCase?: any): UserController {
  return new UserController(
    { execute: jest.fn() } as any, // createUser
    { execute: jest.fn() } as any, // changePassword
    { execute: jest.fn() } as any, // deleteAccount
    { execute: jest.fn() } as any, // suspend
    { execute: jest.fn() } as any, // changeRole
    { execute: jest.fn() } as any, // verifyPhone
    { execute: jest.fn() } as any, // setup2fa
    { execute: jest.fn() } as any, // reportBreach
    { execute: jest.fn() } as any, // getUser
    { execute: jest.fn() } as any, // updateUser
    { execute: jest.fn() } as any, // verifyEmail
    { execute: jest.fn() } as any, // requestPasswordReset
    { execute: jest.fn() } as any, // resetPassword
    { sendPasswordResetEmail: jest.fn(), sendEmail: jest.fn() } as any, // emailService
    { notify: jest.fn() } as any,   // notificationClient
    undefined,                       // userRepository
    resolveNamesUseCase
  );
}

function makeReq(body: any): Partial<Request> {
  return { body, params: {}, headers: {} };
}

function makeRes(): { res: Partial<Response>; statusCode: number; body: any } {
  const state: { statusCode: number; body: any } = { statusCode: 0, body: null };
  const res: Partial<Response> = {
    status: jest.fn().mockImplementation((code: number) => {
      state.statusCode = code;
      return res as any;
    }),
    json: jest.fn().mockImplementation((payload: any) => {
      state.body = payload;
      return res as any;
    }),
  };
  return { res, ...state };
}

describe('UserController.resolveNames', () => {
  it('returns 503 when the use case is not wired in', async () => {
    const controller = makeController(undefined);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({ ids: ['u1'] }) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns 400 when body is not an object', async () => {
    const controller = makeController({ execute: jest.fn() } as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq('not-an-object') as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when ids is missing', async () => {
    const controller = makeController({ execute: jest.fn() } as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({}) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when ids is an empty array', async () => {
    const controller = makeController({ execute: jest.fn() } as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({ ids: [] }) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when an id is not a non-empty string', async () => {
    const controller = makeController({ execute: jest.fn() } as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({ ids: ['u1', '', 123 as any] }) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 with BATCH_SIZE_EXCEEDED when more than 100 unique IDs are passed', async () => {
    const controller = makeController({ execute: jest.fn() } as any);
    const { res } = makeRes();
    const ids = Array.from({ length: 101 }, (_, i) => `u${i}`);

    await controller.resolveNames(makeReq({ ids }) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('BATCH_SIZE_EXCEEDED');
  });

  it('returns 200 with a map of resolved and null entries', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(new Map([
        ['u1', { fullName: 'Asha Mwakalobo', publicCode: 'MYS-SLR-01', role: 'seller' }],
        ['u2', null],
      ])),
    };
    const controller = makeController(useCase as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({ ids: ['u1', 'u2'] }) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.u1.fullName).toBe('Asha Mwakalobo');
    expect(payload.data.u2).toBeNull();
  });

  it('deduplicates IDs before passing to the use case', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue(new Map([['u1', { fullName: 'A', publicCode: 'M', role: 'seller' }]])) };
    const controller = makeController(useCase as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({ ids: ['u1', 'u1', 'u1'] }) as Request, res as Response);

    expect(useCase.execute).toHaveBeenCalledWith({ ids: ['u1'] });
  });

  it('returns 500 when the use case throws', async () => {
    const useCase = { execute: jest.fn().mockRejectedValue(new Error('boom')) };
    const controller = makeController(useCase as any);
    const { res } = makeRes();

    await controller.resolveNames(makeReq({ ids: ['u1'] }) as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect((res.json as jest.Mock).mock.calls[0][0].error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
