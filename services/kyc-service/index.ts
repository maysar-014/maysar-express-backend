import { Router } from 'express';
import { Module } from '../../src/core/module.interface';
import { eventBus } from '../../shared/events/eventBus';
import { initializeEventRegistry } from '../../shared/events/registry';
import { logger } from './src/infrastructure/services/logger.service';
import { PrismaKycRepository } from './src/infrastructure/repositories/prisma-kyc.repository';
import { KycEvaluationService } from './src/domain/services/kyc-evaluation.service';
import { KycEnforcementPolicy } from './src/domain/policies/kyc-enforcement.policy';
import { SubmitKycUseCase } from './src/application/use-cases/submit-kyc.use-case';
import { EvaluateKycUseCase } from './src/application/use-cases/evaluate-kyc.use-case';
import { AdminVerifyKycUseCase } from './src/application/use-cases/admin-verify-kyc.use-case';
import { GetKycStatusUseCase } from './src/application/use-cases/get-kyc-status.use-case';
import { KycEventSubscriber } from './src/application/event-handlers/kyc-event-subscriber';
import { KycController } from './src/api/controllers/kyc.controller';
import { KycAdminController } from './src/api/controllers/kyc-admin.controller';
import { createKycRoutes } from './src/api/routes/kyc.routes';
import { healthRoutes } from './src/api/routes/health.routes';
import { requireKycLevel } from './src/api/middleware/kyc-gate.middleware';

const repository = new PrismaKycRepository();
const evaluationService = new KycEvaluationService();
const policy = new KycEnforcementPolicy();
const submitKycUseCase = new SubmitKycUseCase(repository);
const evaluateKycUseCase = new EvaluateKycUseCase(repository, evaluationService);
const adminVerifyKycUseCase = new AdminVerifyKycUseCase(repository);
const getKycStatusUseCase = new GetKycStatusUseCase(repository, policy);
const kycController = new KycController(submitKycUseCase, getKycStatusUseCase);
const kycAdminController = new KycAdminController(adminVerifyKycUseCase);
const kycEventSubscriber = new KycEventSubscriber(repository, evaluationService);

const router = Router();
router.use('/health', healthRoutes);
router.use('/', createKycRoutes(kycController, kycAdminController));

let initialized = false;

export const KycModule: Module = {
  name: 'kyc-service',
  initialize: async () => {
    if (initialized) {
      return;
    }

    logger.info('Initializing kyc-service module');
    initializeEventRegistry();
    await kycEventSubscriber.register();
    initialized = true;

    // Warm up the evaluation use case so the dependency graph stays exercised.
    void evaluateKycUseCase;
    void eventBus;
  },
  routes: router,
  shutdown: async () => {
    logger.info('Shutting down kyc-service module');
  }
};

export { requireKycLevel };

