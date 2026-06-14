import { Router } from 'express';
import { ProductionPlanRepository } from './src/infrastructure/repositories/ProductionPlanRepository';
import { ProductionOrderRepository } from './src/infrastructure/repositories/ProductionOrderRepository';
import { BulkOrderRepository } from './src/infrastructure/repositories/BulkOrderRepository';
import { CapacityRepository } from './src/infrastructure/repositories/CapacityRepository';
import { QualityCheckpointRepository } from './src/infrastructure/repositories/QualityCheckpointRepository';
import { ProductionMetricsRepository } from './src/infrastructure/repositories/ProductionMetricsRepository';

import { EventBusAdapter } from './src/infrastructure/messaging/EventBusAdapter';
import { InventoryServiceAdapter } from './src/infrastructure/services/InventoryServiceAdapter';
import { OrderServiceAdapter } from './src/infrastructure/services/OrderServiceAdapter';

import { CapacityAllocationPolicy } from './src/domain/policies/CapacityAllocationPolicy';
import { ProductionApprovalPolicy } from './src/domain/policies/ProductionApprovalPolicy';
import { QualityStandardsPolicy } from './src/domain/policies/QualityStandardsPolicy';

import { CapacityUtilizationAlgorithm } from './src/domain/algorithms/CapacityUtilizationAlgorithm';
import { ProductionSchedulingAlgorithm } from './src/domain/algorithms/ProductionSchedulingAlgorithm';

import { CapacityManagementEngine } from './src/domain/engines/CapacityManagementEngine';
import { ProductionPlanningEngine } from './src/domain/engines/ProductionPlanningEngine';
import { QualityControlEngine } from './src/domain/engines/QualityControlEngine';

import { CreateProductionPlan } from './src/application/use-cases/CreateProductionPlan';
import { UpdateProductionStatus } from './src/application/use-cases/UpdateProductionStatus';
import { RecordQualityCheckpoint } from './src/application/use-cases/RecordQualityCheckpoint';
import { CompleteProduction } from './src/application/use-cases/CompleteProduction';
import { GetProductionDashboard } from './src/application/use-cases/GetProductionDashboard';
import { CalculateProductionCapacity } from './src/application/use-cases/CalculateProductionCapacity';
import { UpdateProductionCapacity } from './src/application/use-cases/UpdateProductionCapacity';
import { CreateBulkOrderRequest } from './src/application/use-cases/CreateBulkOrderRequest';
import { ListBulkOrderRequests } from './src/application/use-cases/ListBulkOrderRequests';
import { GetBulkOrderRequest } from './src/application/use-cases/GetBulkOrderRequest';
import { SubmitBulkOrderQuote } from './src/application/use-cases/SubmitBulkOrderQuote';

import { ProductionPlanSaga } from './src/application/sagas/ProductionPlanSaga';
import { CapacityAdjustmentSaga } from './src/application/sagas/CapacityAdjustmentSaga';
import { ProductionController } from './src/api/controllers/ProductionController';
import { createProductionRoutes } from './src/api/routes/productionRoutes';
import { OrderEventHandler } from './src/infrastructure/events/OrderEventHandler';

// Define Module Interface locally to avoid relative import issues if common is far
interface Module {
    name: string;
    initialize: () => Promise<void>;
    shutdown: () => Promise<void>;
    routes?: Router;
}

export const ProductionModule: Module = {
    name: 'production-service',
    routes: Router(),
    initialize: async () => {
        console.log('Initializing Production Service...');

        // Reuse the global Prisma singleton to avoid exhausting the connection pool.
        const { prisma: sharedPrisma } = await import('../../src/config/prisma');
        const prisma = sharedPrisma as any;

        // 1. Adapters
        const localEventBus = EventBusAdapter.getInstance();
        const inventoryService = new InventoryServiceAdapter();
        const orderService = new OrderServiceAdapter();

        // 2. Repositories
        const planRepo = new ProductionPlanRepository(prisma);
        const orderRepo = new ProductionOrderRepository(prisma);
        const bulkOrderRepo = new BulkOrderRepository(prisma);
        const capacityRepo = new CapacityRepository(prisma);
        const qualityRepo = new QualityCheckpointRepository(prisma);
        const metricsRepo = new ProductionMetricsRepository(prisma);

        // 3. Domain Logic
        const capacityPolicy = new CapacityAllocationPolicy();
        const approvalPolicy = new ProductionApprovalPolicy();
        const qualityPolicy = new QualityStandardsPolicy();

        const utilizationAlgo = new CapacityUtilizationAlgorithm();
        const schedulingAlgo = new ProductionSchedulingAlgorithm();

        const capacityEngine = new CapacityManagementEngine(capacityPolicy, utilizationAlgo);
        const planningEngine = new ProductionPlanningEngine(schedulingAlgo, capacityEngine, approvalPolicy);
        const qualityEngine = new QualityControlEngine(qualityPolicy);

        // 4. Use Cases
        const createPlanUseCase = new CreateProductionPlan(planRepo, planningEngine);
        const updateStatusUseCase = new UpdateProductionStatus(planRepo);
        const recordQualityUseCase = new RecordQualityCheckpoint(qualityRepo, qualityEngine);
        const completeProductionUseCase = new CompleteProduction(orderRepo, inventoryService, localEventBus);
        const getDashboardUseCase = new GetProductionDashboard(planRepo, orderRepo);
        const calculateCapacityUseCase = new CalculateProductionCapacity(capacityRepo);
        const capacityAdjustmentSaga = new CapacityAdjustmentSaga(capacityEngine, localEventBus);
        const updateCapacityUseCase = new UpdateProductionCapacity(capacityRepo, capacityAdjustmentSaga);
        const createBulkOrderRequestUseCase = new CreateBulkOrderRequest(bulkOrderRepo);
        const listBulkOrderRequestsUseCase = new ListBulkOrderRequests(bulkOrderRepo);
        const getBulkOrderRequestUseCase = new GetBulkOrderRequest(bulkOrderRepo);
        const submitBulkOrderQuoteUseCase = new SubmitBulkOrderQuote(bulkOrderRepo);

        // 5. Sagas
        const planningSaga = new ProductionPlanSaga(planRepo, orderRepo, orderService, inventoryService, planningEngine, localEventBus);

        // 6. Controllers
        const controller = new ProductionController(
            createPlanUseCase,
            updateStatusUseCase,
            recordQualityUseCase,
            getDashboardUseCase,
            calculateCapacityUseCase,
            updateCapacityUseCase,
            createBulkOrderRequestUseCase,
            listBulkOrderRequestsUseCase,
            getBulkOrderRequestUseCase,
            submitBulkOrderQuoteUseCase
        );

        // 7. Routes
        const router = createProductionRoutes(controller);
        ProductionModule.routes?.use('/', router);

        // 8. Event Handlers
        const orderHandler = new OrderEventHandler(planningSaga);

        console.log('Production Service Initialized.');
    },
    shutdown: async () => {
        console.log('Shutting down Production Service...');
        // No-op: shared Prisma singleton is managed by the monolith lifecycle
    }
};
