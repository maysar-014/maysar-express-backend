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
  validateCreateBusinessDocument,
  validateCreateComplianceRecord
} from '../middleware/validation.middleware';
import { SagaEventHandler } from '../../application/sagas/saga-event-handler';
import { MailerAdapter, ComplianceAdapter, CapabilityAdapter } from '../../infrastructure/adapters';
import { eventBus } from '@shared/events/eventBus';
import { logger } from '../../infrastructure/services/logger.service';

let businessController: BusinessController;
let businessRepository: PrismaBusinessRepository;
let businessDocumentRepository: PrismaBusinessDocumentRepository;
let businessComplianceRepository: PrismaBusinessComplianceRepository;
let sagaEventHandler: SagaEventHandler;

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
  const router = Router();
  const controller = initializeController();

  router.post('/', validateCreateBusiness, (req, res, next) =>
    controller.registerBusiness(req, res).catch(next)
  );
  router.get('/search', (req, res, next) => controller.searchBusinesses(req, res).catch(next));
  router.get('/owner/:ownerId', (req, res, next) => controller.getBusinessesByOwner(req, res).catch(next));
  router.get('/:id', (req, res, next) => controller.getBusinessById(req, res).catch(next));
  router.put('/:id', validateUpdateBusiness, (req, res, next) => controller.updateBusiness(req, res).catch(next));
  router.delete('/:id', (req, res, next) => controller.deleteBusiness(req, res).catch(next));
  router.post('/:id/verify', validateVerifyBusiness, (req, res, next) =>
    controller.verifyBusiness(req, res).catch(next)
  );
  router.post('/:id/suspend', validateSuspendBusiness, (req, res, next) =>
    controller.suspendBusiness(req, res).catch(next)
  );
  router.post('/:id/reactivate', (req, res, next) => controller.reactivateBusiness(req, res).catch(next));

  router.post('/:id/documents', validateCreateBusinessDocument, (req, res, next) =>
    controller.addDocument(req, res).catch(next)
  );
  router.get('/:id/documents', (req, res, next) => controller.listDocuments(req, res).catch(next));

  router.post('/:id/compliance-records', validateCreateComplianceRecord, (req, res, next) =>
    controller.addComplianceRecord(req, res).catch(next)
  );
  router.get('/:id/compliance-records', (req, res, next) => controller.listComplianceRecords(req, res).catch(next));

  return router;
}
