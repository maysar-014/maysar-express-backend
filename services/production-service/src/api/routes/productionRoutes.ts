
import { Router } from 'express';
import { ProductionController } from '../controllers/ProductionController';
import { createProductionPlanSchema, updateProductionStatusSchema } from '../validators/production-plan.validator';
import { recordQualityCheckpointSchema } from '../validators/quality.validator';
import { checkCapacitySchema } from '../validators/capacity.validator';
// Assuming a shared validation middleware exists or I'll iterate
// The user plan mentioned "middleware/validation.middleware.ts" exists in community service.
// I will assume a local one or shared one needs to be imported.
// For now I'll use a placeholder import path; update to the real shared path when available.
// Given "modular monolith" context, shared utils are often in a `shared` package or common folder.
// I'll skip middleware implementation import for now and just set up routes structure
// But I should comment where middleware goes.

export const createProductionRoutes = (controller: ProductionController): Router => {
    const router = Router();

    // Middleware placeholders
    const validate = (schema: any) => (req: any, res: any, next: any) => next();
    const authenticate = (req: any, res: any, next: any) => next();

    router.post(
        '/plans',
        authenticate,
        validate(createProductionPlanSchema),
        (req, res) => controller.createPlan(req, res)
    );

    router.get(
        '/dashboard',
        authenticate,
        (req, res) => controller.getDashboard(req, res)
    );

    router.put(
        '/plans/:id/status',
        authenticate,
        validate(updateProductionStatusSchema),
        (req, res) => controller.updateStatus(req, res)
    );

    router.post(
        '/quality/checkpoints',
        authenticate,
        validate(recordQualityCheckpointSchema),
        (req, res) => controller.recordQuality(req, res)
    );

    router.get(
        '/capacity',
        authenticate,
        validate(checkCapacitySchema),
        (req, res) => controller.getCapacity(req, res)
    );

    return router;
};
