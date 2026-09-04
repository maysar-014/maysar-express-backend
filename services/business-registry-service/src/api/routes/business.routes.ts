import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { RegisterBusinessUseCase } from '../../application/use-cases/register-business.use-case';
import { VerifyBusinessUseCase } from '../../application/use-cases/verify-business.use-case';
import { UpdateBusinessUseCase } from '../../application/use-cases/update-business.use-case';
import { SuspendBusinessUseCase } from '../../application/use-cases/suspend-business.use-case';
import { ReactivateBusinessUseCase } from '../../application/use-cases/reactivate-business.use-case';
import { BusinessValidationService } from '../../domain/services/business-validation.service';
import { PrismaBusinessRepository } from '../../infrastructure/repositories/prisma-business.repository';
import { PrismaBusinessDocumentRepository } from '../../infrastructure/repositories/prisma-business-document.repository';
import { PrismaBusinessComplianceRepository } from '../../infrastructure/repositories/prisma-business-compliance.repository';
import { getPrismaClient } from '../../infrastructure/database/prisma-client';
import {
  validateCreateBusiness,
  validateUpdateBusiness,
  validateVerifyBusiness,
  validateSuspendBusiness,
  validateReactivateBusiness,
  validateCreateBusinessDocument,
  validateCreateComplianceRecord,
  validateBusinessIdParam,
  validatePublicSellerQuery,
  validatePublicSellerIdParam,
  validatePublicIndustryParam
} from '../middleware/validation.middleware';
import { SagaEventHandler } from '../../application/sagas/saga-event-handler';
import { MailerAdapter, ComplianceAdapter, CapabilityAdapter } from '../../infrastructure/adapters';
import { eventBus } from '@shared/events/eventBus';
import { logger } from '../../infrastructure/services/logger.service';
import { requireAuth } from '@shared/middleware/auth-context.middleware';

let businessController: BusinessController;
let businessRepository: PrismaBusinessRepository;
let businessDocumentRepository: PrismaBusinessDocumentRepository;
let businessComplianceRepository: PrismaBusinessComplianceRepository;
let sagaEventHandler: SagaEventHandler;

type BusinessRouteMode = 'default' | 'legacy';

function initializeController(): BusinessController {
  if (!businessController) {
    const prisma = getPrismaClient();
    businessRepository = new PrismaBusinessRepository(prisma);
    businessDocumentRepository = new PrismaBusinessDocumentRepository(prisma);
    businessComplianceRepository = new PrismaBusinessComplianceRepository(prisma);
    const businessValidationService = new BusinessValidationService();
    
    const mailerAdapter = new MailerAdapter();
    const complianceAdapter = new ComplianceAdapter();
    const capabilityAdapter = new CapabilityAdapter();
    
    sagaEventHandler = new SagaEventHandler({
      mailer: mailerAdapter,
      compliance: complianceAdapter,
      capability: capabilityAdapter,
      businessRepository
    });
    
    sagaEventHandler.setupSubscriptions(eventBus);
    logger.info('✅ Business Registry Saga Event Handlers initialized');

    const registerBusinessUseCase = new RegisterBusinessUseCase(businessRepository, businessValidationService, sagaEventHandler);
    const verifyBusinessUseCase = new VerifyBusinessUseCase(businessRepository, sagaEventHandler);
    const updateBusinessUseCase = new UpdateBusinessUseCase(businessRepository, sagaEventHandler);
    const suspendBusinessUseCase = new SuspendBusinessUseCase(businessRepository, sagaEventHandler);
    const reactivateBusinessUseCase = new ReactivateBusinessUseCase(businessRepository, sagaEventHandler);

    businessController = new BusinessController(
      registerBusinessUseCase,
      verifyBusinessUseCase,
      updateBusinessUseCase,
      suspendBusinessUseCase,
      reactivateBusinessUseCase,
      businessRepository,
      businessDocumentRepository,
      businessComplianceRepository
    );
  }
  return businessController;
}

export function createBusinessRoutes(): Router {
  return createConfiguredBusinessRoutes('default');
}

export function createLegacyBusinessRoutes(): Router {
  return createConfiguredBusinessRoutes('legacy');
}

export function createPublicBusinessRoutes(): Router {
  const router = Router();
  const controller = initializeController();

  router.get('/sellers', validatePublicSellerQuery, (req, res, next) =>
    controller.listPublicSellers(req, res).catch(next)
  );
  router.get('/sellers/:sellerId/industries', validatePublicSellerIdParam, (req, res, next) =>
    controller.getPublicSellerIndustries(req, res).catch(next)
  );
  router.get('/sellers/:sellerId', validatePublicSellerIdParam, (req, res, next) =>
    controller.getPublicSellerById(req, res).catch(next)
  );
  router.get('/industries/:industry/sellers', validatePublicIndustryParam, validatePublicSellerQuery, (req, res, next) =>
    controller.listSellersByIndustry(req, res).catch(next)
  );

  return router;
}

function createConfiguredBusinessRoutes(mode: BusinessRouteMode): Router {
  const router = Router();
  const controller = initializeController();

  router.use(requireAuth);

  if (mode === 'default') {
    router.post('/', validateCreateBusiness, (req, res, next) =>
      controller.registerBusiness(req, res).catch(next)
    );
  }

  router.get('/search', (req, res, next) => controller.searchBusinesses(req, res).catch(next));
  // Owner lookup MUST come before /:id to prevent "owner" being matched as a business ID
  router.get('/owner/:ownerId', (req, res, next) => controller.getBusinessesByOwner(req, res).catch(next));
  router.get('/:id', validateBusinessIdParam, (req, res, next) => controller.getBusinessById(req, res).catch(next));
  router.put('/:id', validateBusinessIdParam, validateUpdateBusiness, (req, res, next) => controller.updateBusiness(req, res).catch(next));
  router.delete('/:id', validateBusinessIdParam, (req, res, next) => controller.deleteBusiness(req, res).catch(next));
  router.post('/:id/verify', validateBusinessIdParam, validateVerifyBusiness, (req, res, next) =>
    controller.verifyBusiness(req, res).catch(next)
  );
  router.post('/:id/suspend', validateBusinessIdParam, validateSuspendBusiness, (req, res, next) =>
    controller.suspendBusiness(req, res).catch(next)
  );
  router.post('/:id/reactivate', validateBusinessIdParam, validateReactivateBusiness, (req, res, next) =>
    controller.reactivateBusiness(req, res).catch(next)
  );

  if (mode === 'default') {
    router.post('/:id/documents', validateBusinessIdParam, validateCreateBusinessDocument, (req, res, next) =>
      controller.addDocument(req, res).catch(next)
    );
    router.get('/:id/documents', validateBusinessIdParam, (req, res, next) => controller.listDocuments(req, res).catch(next));

    router.post('/:id/compliance-records', validateBusinessIdParam, validateCreateComplianceRecord, (req, res, next) =>
      controller.addComplianceRecord(req, res).catch(next)
    );
    router.get('/:id/compliance-records', validateBusinessIdParam, (req, res, next) => controller.listComplianceRecords(req, res).catch(next));
  }

  return router;
}
