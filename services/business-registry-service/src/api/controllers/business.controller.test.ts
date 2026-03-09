import type { Request, Response } from 'express';
import { BusinessNotFoundError, UnauthorizedBusinessOperationError } from '../../domain/errors/business.errors';

const mockToResponseDto = jest.fn((business: { id: string }) => ({ id: business.id, mapped: true }));

jest.mock('../../application/mappers/business-mapper', () => ({
  BusinessMapper: {
    toResponseDto: (...args: unknown[]) => mockToResponseDto(...(args as [{ id: string }]))
  }
}));

import { BusinessController } from './business.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('BusinessController', () => {
  const registerBusinessUseCase = { execute: jest.fn() };
  const verifyBusinessUseCase = { execute: jest.fn() };
  const updateBusinessUseCase = { execute: jest.fn() };
  const suspendBusinessUseCase = { execute: jest.fn() };
  const reactivateBusinessUseCase = { execute: jest.fn() };
  const businessRepository = {
    findById: jest.fn(),
    delete: jest.fn(),
    findByOwnerId: jest.fn(),
    search: jest.fn()
  };

  const makeController = () =>
    new BusinessController(
      registerBusinessUseCase as never,
      verifyBusinessUseCase as never,
      updateBusinessUseCase as never,
      suspendBusinessUseCase as never,
      reactivateBusinessUseCase as never,
      businessRepository as never
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers business and returns 201 response', async () => {
    const controller = makeController();
    const req = { body: { name: 'Acme Traders' } } as Request;
    const res = createResponse();
    registerBusinessUseCase.execute.mockResolvedValue({ id: 'biz-1' });

    await controller.registerBusiness(req, res);

    expect(registerBusinessUseCase.execute).toHaveBeenCalledWith({ name: 'Acme Traders' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { id: 'biz-1', mapped: true }
      })
    );
  });

  it('returns business by id when found', async () => {
    const controller = makeController();
    const req = { params: { id: 'biz-10' } } as unknown as Request;
    const res = createResponse();
    businessRepository.findById.mockResolvedValue({ id: 'biz-10' });

    await controller.getBusinessById(req, res);

    expect(businessRepository.findById).toHaveBeenCalledWith('biz-10');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws BusinessNotFoundError when business does not exist', async () => {
    const controller = makeController();
    const req = { params: { id: 'missing' } } as unknown as Request;
    const res = createResponse();
    businessRepository.findById.mockResolvedValue(null);

    await expect(controller.getBusinessById(req, res)).rejects.toBeInstanceOf(BusinessNotFoundError);
  });

  it('requires x-user-id header when updating business', async () => {
    const controller = makeController();
    const req = {
      params: { id: 'biz-20' },
      headers: {},
      body: { name: 'Updated Name' }
    } as unknown as Request;
    const res = createResponse();

    await expect(controller.updateBusiness(req, res)).rejects.toBeInstanceOf(UnauthorizedBusinessOperationError);
  });

  it('updates business with actor identity', async () => {
    const controller = makeController();
    const req = {
      params: { id: 'biz-21' },
      headers: { 'x-user-id': 'admin-1' },
      body: { industry: 'Retail' }
    } as unknown as Request;
    const res = createResponse();
    updateBusinessUseCase.execute.mockResolvedValue({ id: 'biz-21' });

    await controller.updateBusiness(req, res);

    expect(updateBusinessUseCase.execute).toHaveBeenCalledWith('biz-21', { industry: 'Retail' }, 'admin-1');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('deletes business only when it exists', async () => {
    const controller = makeController();
    const req = { params: { id: 'biz-30' } } as unknown as Request;
    const res = createResponse();
    businessRepository.findById.mockResolvedValue({ id: 'biz-30' });

    await controller.deleteBusiness(req, res);

    expect(businessRepository.delete).toHaveBeenCalledWith('biz-30');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('throws BusinessNotFoundError on delete for missing record', async () => {
    const controller = makeController();
    const req = { params: { id: 'biz-missing' } } as unknown as Request;
    const res = createResponse();
    businessRepository.findById.mockResolvedValue(null);

    await expect(controller.deleteBusiness(req, res)).rejects.toBeInstanceOf(BusinessNotFoundError);
  });

  it('verifies and suspends business through dedicated use cases', async () => {
    const controller = makeController();
    const verifyReq = {
      params: { id: 'biz-40' },
      body: { verifiedBy: 'auditor-1', documentTypes: ['TIN'] }
    } as unknown as Request;
    const suspendReq = {
      params: { id: 'biz-40' },
      body: { suspendedBy: 'admin-2', reason: 'compliance review' }
    } as unknown as Request;
    const res = createResponse();
    verifyBusinessUseCase.execute.mockResolvedValue({ id: 'biz-40' });
    suspendBusinessUseCase.execute.mockResolvedValue({ id: 'biz-40' });

    await controller.verifyBusiness(verifyReq, res);
    await controller.suspendBusiness(suspendReq, res);

    expect(verifyBusinessUseCase.execute).toHaveBeenCalledWith({
      businessId: 'biz-40',
      verifiedBy: 'auditor-1',
      documentTypes: ['TIN']
    });
    expect(suspendBusinessUseCase.execute).toHaveBeenCalledWith({
      businessId: 'biz-40',
      suspendedBy: 'admin-2',
      reason: 'compliance review'
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('reactivates with header fallback and supports owner/search queries', async () => {
    const controller = makeController();
    const reactivateReq = {
      params: { id: 'biz-50' },
      headers: {},
      body: { reactivatedBy: 'admin-5' }
    } as unknown as Request;
    const ownerReq = { params: { ownerId: 'owner-9' } } as unknown as Request;
    const searchReq = { query: { q: 'acme', limit: '10', offset: '5' } } as unknown as Request;
    const res = createResponse();

    reactivateBusinessUseCase.execute.mockResolvedValue({ id: 'biz-50' });
    businessRepository.findByOwnerId.mockResolvedValue([{ id: 'biz-51' }]);
    businessRepository.search.mockResolvedValue([{ id: 'biz-52' }]);

    await controller.reactivateBusiness(reactivateReq, res);
    await controller.getBusinessesByOwner(ownerReq, res);
    await controller.searchBusinesses(searchReq, res);

    expect(reactivateBusinessUseCase.execute).toHaveBeenCalledWith('biz-50', 'admin-5');
    expect(businessRepository.findByOwnerId).toHaveBeenCalledWith('owner-9');
    expect(businessRepository.search).toHaveBeenCalledWith('acme', 10, 5);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
