import type { NextFunction, Request, Response } from 'express';
import {
  validateBusinessIdParam,
  validateCreateBusinessDocument,
  validateCreateBusiness,
  validateReactivateBusiness,
  validateSuspendBusiness,
} from './validation.middleware';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return response as unknown as Response;
};

describe('business validation middleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects document payloads that omit fileUrl', () => {
    const req = {
      body: {
        type: 'REGISTRATION_CERTIFICATE',
        fileName: 'contract-registration.pdf',
      },
    } as unknown as Request;
    const res = createResponse();

    validateCreateBusinessDocument(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects suspend payloads with non-string reason values', () => {
    const req = {
      body: {
        suspendedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        reason: {},
      },
    } as unknown as Request;
    const res = createResponse();

    validateSuspendBusiness(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects reactivation payloads with invalid body shapes', () => {
    const req = {
      body: [null, null],
    } as unknown as Request;
    const res = createResponse();

    validateReactivateBusiness(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid business id params before controller execution', () => {
    const req = {
      params: {
        id: 'not-a-business-id',
      },
    } as unknown as Request;
    const res = createResponse();

    validateBusinessIdParam(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects business industries that exceed the documented maximum length', () => {
    const req = {
      body: {
        name: 'Contract Business',
        businessType: 'SOLE_PROPRIETORSHIP',
        registrationNumber: 'TZ-DAR-123456',
        ownerId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
        industry: ['a'.repeat(101)]
      },
    } as unknown as Request;
    const res = createResponse();

    validateCreateBusiness(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
