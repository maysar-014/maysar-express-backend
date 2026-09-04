/**
 * Unit tests for KycController
 * Verifies that data.status is always a defined string in getStatus responses
 */

import { KycController } from '../../api/controllers/kyc.controller';
import { KycStatus } from '../../domain/types/kyc.types';
import { Request, Response } from 'express';

function makeReq(userId: string): Partial<Request> {
  return {
    user: { userId } as any,
    body: {},
    headers: {}
  } as Partial<Request>;
}

function makeRes(): { res: Partial<Response>; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnThis();
  return { res: { json, status } as Partial<Response>, json, status };
}

describe('KycController.getStatus', () => {
  const statusValues: KycStatus[] = [
    KycStatus.NONE,
    KycStatus.PENDING,
    KycStatus.VERIFIED,
    KycStatus.REJECTED
  ];

  statusValues.forEach((kycStatus) => {
    it(`returns data.status = "${kycStatus}" (never undefined) for kycStatus ${kycStatus}`, async () => {
      const mockGetKycStatusUseCase = {
        execute: jest.fn().mockResolvedValue({
          userId: 'usr_001',
          kycStatus,
          kycLevel: 1,
          limits: { maxListings: 10, maxTransactions: 100, maxEarnings: 10000 },
          restrictedFeatures: [],
          nextRequiredAction: 'none'
        })
      };
      const controller = new KycController(
        { execute: jest.fn() } as any,
        mockGetKycStatusUseCase as any
      );
      const { res, json } = makeRes();

      await controller.getStatus(makeReq('usr_001') as Request, res as Response);

      expect(json).toHaveBeenCalled();
      const payload = json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.status).toBeDefined();
      expect(typeof payload.data.status).toBe('string');
      expect(payload.data.status).toBe(kycStatus);
    });
  });

  it('returns data.status = "none" (fallback) when kycStatus is undefined', async () => {
    const mockGetKycStatusUseCase = {
      execute: jest.fn().mockResolvedValue({
        userId: 'usr_002',
        kycStatus: undefined,
        kycLevel: 0,
        limits: { maxListings: 0, maxTransactions: 0, maxEarnings: 0 },
        restrictedFeatures: [],
        nextRequiredAction: 'submit_kyc'
      })
    };
    const controller = new KycController(
      { execute: jest.fn() } as any,
      mockGetKycStatusUseCase as any
    );
    const { res, json } = makeRes();

    await controller.getStatus(makeReq('usr_002') as Request, res as Response);

    const payload = json.mock.calls[0][0];
    expect(payload.data.status).toBe('none');
  });

  it('returns 401 when no authenticated user', async () => {
    const controller = new KycController(
      { execute: jest.fn() } as any,
      { execute: jest.fn() } as any
    );
    const { res, json, status } = makeRes();
    const req: Partial<Request> = { body: {}, headers: {} };

    await controller.getStatus(req as Request, res as Response);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
