import { Router } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { RegisterBusinessUseCase } from '../../application/use-cases/register-business.use-case';
import { VerifyBusinessUseCase } from '../../application/use-cases/verify-business.use-case';
import { UpdateBusinessUseCase } from '../../application/use-cases/update-business.use-case';
import { SuspendBusinessUseCase } from '../../application/use-cases/suspend-business.use-case';
import { ReactivateBusinessUseCase } from '../../application/use-cases/reactivate-business.use-case';
import { BusinessValidationService } from '../../domain/services/business-validation.service';
import { PrismaBusinessRepository } from '../../infrastructure/repositories/prisma-business.repository';
import { getPrismaClient } from '../../infrastructure/database/prisma-client';
import {
  validateCreateBusiness,
  validateUpdateBusiness,
  validateVerifyBusiness,
  validateSuspendBusiness
} from '../middleware/validation.middleware';
import { SagaEventHandler } from '../../application/sagas/saga-event-handler';
import { MailerAdapter, ComplianceAdapter, CapabilityAdapter } from '../../infrastructure/adapters';

let businessController: BusinessController;
let businessRepository: PrismaBusinessRepository;
let sagaEventHandler: SagaEventHandler;

function initializeController(): BusinessController {
  if (!businessController) {
    const prisma = getPrismaClient();
    businessRepository = new PrismaBusinessRepository(prisma);
    const businessValidationService = new BusinessValidationService();
    
    // Initialize adapters for saga event handling
    const mailerAdapter = new MailerAdapter();
    const complianceAdapter = new ComplianceAdapter();
    const capabilityAdapter = new CapabilityAdapter();
    
    // Initialize saga event handler with dependencies
    sagaEventHandler = new SagaEventHandler({
      mailer: mailerAdapter,
      compliance: complianceAdapter,
      capability: capabilityAdapter,
      businessRepository
    });

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
      businessRepository
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

  return router;
}
