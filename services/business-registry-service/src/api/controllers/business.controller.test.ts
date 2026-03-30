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

const makePublicBusiness = (overrides: Partial<{
  id: string;
  name: string;
  ownerId: string;
  industry: string[];
  createdAt: Date;
  updatedAt: Date;
}> = {}) => ({
  id: 'biz-1',
  name: 'Acme Retail',
  businessType: 'CORPORATION',
  registrationNumber: 'TZ-DAR-12345',
  taxId: null,
  status: 'ACTIVE',
  verificationStatus: 'VERIFIED',
  complianceStatus: 'COMPLIANT',
  ownerId: 'seller-1',
  description: 'A public seller',
  industry: ['retail'],
  website: 'https://acme.test',
  email: 'hello@acme.test',
  phoneNumber: '255700000001',
  verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  verifiedBy: 'verifier-1',
  addresses: [],
  createdAt: new Date('2026-01-03T00:00:00.000Z'),
  updatedAt: new Date('2026-01-04T00:00:00.000Z'),
  ...overrides
});

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
    search: jest.fn(),
    findPublicSellerPreviews: jest.fn(),
    findPublicBusinesses: jest.fn()
  };
  const businessDocumentRepository = {
    createDocument: jest.fn(),
    findByBusinessId: jest.fn()
  };
  const businessComplianceRepository = {
    createRecord: jest.fn(),
    findByBusinessId: jest.fn()
  };

  const makeController = () =>
    new BusinessController(
      registerBusinessUseCase as never,
      verifyBusinessUseCase as never,
      updateBusinessUseCase as never,
      suspendBusinessUseCase as never,
      reactivateBusinessUseCase as never,
      businessRepository as never,
      businessDocumentRepository as never,
      businessComplianceRepository as never
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

  it('uses the business owner for contract-test updates', async () => {
    const controller = makeController();
    const req = {
      params: { id: 'biz-ct' },
      headers: { 'x-user-id': 'usr_test_0001', 'x-contract-test': '1' },
      body: {}
    } as unknown as Request;
    const res = createResponse();
    businessRepository.findById.mockResolvedValue({ id: 'biz-ct', ownerId: 'owner-ct' });
    updateBusinessUseCase.execute.mockResolvedValue({ id: 'biz-ct' });

    await controller.updateBusiness(req, res);

    expect(updateBusinessUseCase.execute).toHaveBeenCalledWith('biz-ct', {}, 'owner-ct');
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

  it('lists public sellers with aggregated seller data', async () => {
    const controller = makeController();
    const req = {
      params: {},
      query: { q: 'Acme', industry: 'Retail', limit: '20', offset: '0' }
    } as unknown as Request;
    const res = createResponse();
    const previewBusiness = makePublicBusiness({
      id: 'biz-preview',
      ownerId: 'seller-1',
      name: 'Acme Retail',
      industry: ['retail'],
      createdAt: new Date('2026-01-02T00:00:00.000Z')
    });
    const newerBusiness = makePublicBusiness({
      id: 'biz-2',
      ownerId: 'seller-1',
      name: 'Acme Fashion',
      industry: ['fashion'],
      createdAt: new Date('2026-01-05T00:00:00.000Z')
    });

    businessRepository.findPublicSellerPreviews.mockResolvedValue([previewBusiness]);
    businessRepository.findPublicBusinesses.mockResolvedValue([previewBusiness, newerBusiness]);

    await controller.listPublicSellers(req, res);

    expect(businessRepository.findPublicSellerPreviews).toHaveBeenCalledWith({
      industry: 'retail',
      industries: ['retail'],
      query: 'Acme',
      limit: 21,
      offset: 0
    });
    expect(businessRepository.findPublicBusinesses).toHaveBeenCalledWith({ sellerIds: ['seller-1'] });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          items: [
            expect.objectContaining({
              sellerId: 'seller-1',
              sellerName: 'Acme Fashion',
              businessCount: 2,
              industries: ['fashion', 'retail'],
              primaryBusiness: { id: 'biz-2', mapped: true }
            })
          ],
          pagination: expect.objectContaining({
            limit: 20,
            offset: 0,
            hasMore: false
          })
        })
      })
    );
  });

  it('returns public seller profile and industry summary', async () => {
    const controller = makeController();
    const profileReq = { params: { sellerId: 'seller-1' } } as unknown as Request;
    const industriesReq = { params: { sellerId: 'seller-1' } } as unknown as Request;
    const profileRes = createResponse();
    const industriesRes = createResponse();
    const businesses = [
      makePublicBusiness({
        id: 'biz-1',
        ownerId: 'seller-1',
        name: 'Acme Retail',
        industry: ['retail'],
        createdAt: new Date('2026-01-02T00:00:00.000Z')
      }),
      makePublicBusiness({
        id: 'biz-2',
        ownerId: 'seller-1',
        name: 'Acme Fashion',
        industry: ['fashion', 'retail'],
        createdAt: new Date('2026-01-05T00:00:00.000Z')
      })
    ];

    businessRepository.findPublicBusinesses
      .mockResolvedValueOnce(businesses)
      .mockResolvedValueOnce(businesses);

    await controller.getPublicSellerById(profileReq, profileRes);
    await controller.getPublicSellerIndustries(industriesReq, industriesRes);

    expect(businessRepository.findPublicBusinesses).toHaveBeenNthCalledWith(1, { sellerId: 'seller-1' });
    expect(businessRepository.findPublicBusinesses).toHaveBeenNthCalledWith(2, { sellerId: 'seller-1' });
    expect(profileRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          sellerId: 'seller-1',
          sellerName: 'Acme Fashion',
          businessCount: 2,
          industries: ['fashion', 'retail'],
          businesses: [
            { id: 'biz-2', mapped: true },
            { id: 'biz-1', mapped: true }
          ]
        })
      })
    );
    expect(industriesRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          sellerId: 'seller-1',
          businessCount: 2,
          industries: ['fashion', 'retail']
        })
      })
    );
  });

  it('lists sellers by industry from the path parameter', async () => {
    const controller = makeController();
    const req = {
      params: { industry: 'Retail' },
      query: { q: 'Acme', limit: '5', offset: '1' }
    } as unknown as Request;
    const res = createResponse();
    const previewBusiness = makePublicBusiness({
      id: 'biz-preview',
      ownerId: 'seller-2',
      name: 'Retail Hub',
      industry: ['retail'],
      createdAt: new Date('2026-01-03T00:00:00.000Z')
    });
    businessRepository.findPublicSellerPreviews.mockResolvedValue([previewBusiness]);
    businessRepository.findPublicBusinesses.mockResolvedValue([previewBusiness]);

    await controller.listSellersByIndustry(req, res);

    expect(businessRepository.findPublicSellerPreviews).toHaveBeenCalledWith({
      industry: 'retail',
      industries: ['retail'],
      query: 'Acme',
      limit: 6,
      offset: 1
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
