import express from 'express';
import request from 'supertest';

const mockSetupSubscriptions = jest.fn();
const mockLoggerInfo = jest.fn();

const noOpMiddleware = (_req: express.Request, _res: express.Response, next: express.NextFunction): void => next();

const mockControllerHandlers = {
  registerBusiness: jest.fn(async (_req: express.Request, res: express.Response) => res.status(201).json({ action: 'registerBusiness' })),
  searchBusinesses: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'searchBusinesses' })),
  getBusinessesByOwner: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getBusinessesByOwner' })),
  getBusinessById: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getBusinessById' })),
  updateBusiness: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'updateBusiness' })),
  deleteBusiness: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'deleteBusiness' })),
  verifyBusiness: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'verifyBusiness' })),
  suspendBusiness: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'suspendBusiness' })),
  reactivateBusiness: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'reactivateBusiness' })),
  addDocument: jest.fn(async (_req: express.Request, res: express.Response) => res.status(201).json({ action: 'addDocument' })),
  listDocuments: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'listDocuments' })),
  addComplianceRecord: jest.fn(async (_req: express.Request, res: express.Response) => res.status(201).json({ action: 'addComplianceRecord' })),
  listComplianceRecords: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'listComplianceRecords' })),
  listPublicSellers: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'listPublicSellers' })),
  getPublicSellerById: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getPublicSellerById' })),
  getPublicSellerIndustries: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'getPublicSellerIndustries' })),
  listSellersByIndustry: jest.fn(async (_req: express.Request, res: express.Response) => res.status(200).json({ action: 'listSellersByIndustry' }))
};

jest.mock('../controllers/business.controller', () => ({
  BusinessController: jest.fn().mockImplementation(() => mockControllerHandlers)
}));

jest.mock('../../infrastructure/database/prisma-client', () => ({
  getPrismaClient: jest.fn(() => ({}))
}));

jest.mock('../../infrastructure/repositories/prisma-business.repository', () => ({
  PrismaBusinessRepository: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../infrastructure/repositories/prisma-business-document.repository', () => ({
  PrismaBusinessDocumentRepository: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('../../infrastructure/repositories/prisma-business-compliance.repository', () => ({
  PrismaBusinessComplianceRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../domain/services/business-validation.service', () => ({
  BusinessValidationService: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../../application/use-cases/register-business.use-case', () => ({
  RegisterBusinessUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() }))
}));
jest.mock('../../application/use-cases/verify-business.use-case', () => ({
  VerifyBusinessUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() }))
}));
jest.mock('../../application/use-cases/update-business.use-case', () => ({
  UpdateBusinessUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() }))
}));
jest.mock('../../application/use-cases/suspend-business.use-case', () => ({
  SuspendBusinessUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() }))
}));
jest.mock('../../application/use-cases/reactivate-business.use-case', () => ({
  ReactivateBusinessUseCase: jest.fn().mockImplementation(() => ({ execute: jest.fn() }))
}));

jest.mock('../middleware/validation.middleware', () => ({
  validateCreateBusiness: noOpMiddleware,
  validateUpdateBusiness: noOpMiddleware,
  validateVerifyBusiness: noOpMiddleware,
  validateSuspendBusiness: noOpMiddleware,
  validateReactivateBusiness: noOpMiddleware,
  validateCreateBusinessDocument: noOpMiddleware,
  validateCreateComplianceRecord: noOpMiddleware,
  validateBusinessIdParam: noOpMiddleware,
  validatePublicSellerQuery: noOpMiddleware,
  validatePublicSellerIdParam: noOpMiddleware,
  validatePublicIndustryParam: noOpMiddleware
}));

jest.mock('../../application/sagas/saga-event-handler', () => ({
  SagaEventHandler: jest.fn().mockImplementation(() => ({
    setupSubscriptions: (...args: unknown[]) => mockSetupSubscriptions(...args)
  }))
}));

jest.mock('../../infrastructure/adapters', () => ({
  MailerAdapter: jest.fn().mockImplementation(() => ({})),
  ComplianceAdapter: jest.fn().mockImplementation(() => ({})),
  CapabilityAdapter: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@shared/events/eventBus', () => ({
  eventBus: {}
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: noOpMiddleware
}));

import { createBusinessRoutes, createLegacyBusinessRoutes, createPublicBusinessRoutes } from './business.routes';

describe('business.routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates business routes with lazy controller initialization', () => {
    const router = createBusinessRoutes();
    const endpoints = router.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/',
        '/search',
        '/owner/:ownerId',
        '/:id',
        '/:id/verify',
        '/:id/suspend',
        '/:id/reactivate'
      ])
    );
    expect(mockSetupSubscriptions).toHaveBeenCalled();
    expect(mockLoggerInfo).toHaveBeenCalledWith('✅ Business Registry Saga Event Handlers initialized');
  });

  it('creates public seller routes without auth guard', () => {
    const router = createPublicBusinessRoutes();
    const endpoints = router.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/sellers',
        '/sellers/:sellerId/industries',
        '/sellers/:sellerId',
        '/industries/:industry/sellers'
      ])
    );
  });

  it('delegates representative route handlers to business controller methods', async () => {
    const app = express();
    app.use(express.json());
    app.use('/businesses', createBusinessRoutes());

    const createRes = await request(app).post('/businesses').send({ name: 'Acme' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.action).toBe('registerBusiness');

    const searchRes = await request(app).get('/businesses/search?q=acme');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.action).toBe('searchBusinesses');

    const verifyRes = await request(app).post('/businesses/biz-1/verify').send({ verifiedBy: 'admin' });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.action).toBe('verifyBusiness');

    const reactivateRes = await request(app).post('/businesses/biz-1/reactivate').send({ reactivatedBy: 'admin' });
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.body.action).toBe('reactivateBusiness');
  });

  it('delegates public seller discovery routes to business controller methods', async () => {
    const app = express();
    app.use(express.json());
    app.use('/public', createPublicBusinessRoutes());

    const sellersRes = await request(app).get('/public/sellers?industry=retail&limit=5');
    expect(sellersRes.status).toBe(200);
    expect(sellersRes.body.action).toBe('listPublicSellers');

    const sellerRes = await request(app).get('/public/sellers/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(sellerRes.status).toBe(200);
    expect(sellerRes.body.action).toBe('getPublicSellerById');

    const industriesRes = await request(app).get('/public/sellers/usr_01ARZ3NDEKTSV4RRFFQ69G5FAV/industries');
    expect(industriesRes.status).toBe(200);
    expect(industriesRes.body.action).toBe('getPublicSellerIndustries');

    const industryRes = await request(app).get('/public/industries/retail/sellers');
    expect(industryRes.status).toBe(200);
    expect(industryRes.body.action).toBe('listSellersByIndustry');
  });

  it('creates legacy alias routes without the create endpoint', () => {
    const router = createLegacyBusinessRoutes();
    const endpoints = router.stack
      .filter(layer => (layer as { route?: { path: string } }).route)
      .map(layer => (layer as { route: { path: string } }).route.path);

    expect(endpoints).toEqual(
      expect.arrayContaining([
        '/search',
        '/owner/:ownerId',
        '/:id',
        '/:id/verify',
        '/:id/suspend',
        '/:id/reactivate'
      ])
    );
    expect(endpoints).not.toContain('/');
  });
});
