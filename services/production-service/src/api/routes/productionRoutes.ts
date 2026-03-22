
import { Router } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { ProductionController } from '../controllers/ProductionController';
import { createProductionPlanSchema, updateProductionStatusSchema } from '../validators/production-plan.validator';
import { recordQualityCheckpointSchema } from '../validators/quality.validator';
import { checkCapacitySchema } from '../validators/capacity.validator';
import { requireAuth } from '@shared/middleware/auth-context.middleware';

export const createProductionRoutes = (controller: ProductionController): Router => {
    const router = Router();

    const validate = (schema: ZodSchema) => (req: any, res: any, next: any) => {
        try {
            const parsed = schema.parse({
                body: req.body,
                params: req.params,
                query: req.query
            }) as {
                body?: unknown;
                params?: unknown;
                query?: unknown;
            };

            if (parsed.body !== undefined) req.body = parsed.body;
            if (parsed.params !== undefined) req.params = parsed.params as typeof req.params;
            if (parsed.query !== undefined) req.query = parsed.query as typeof req.query;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Request validation failed',
                        details: error.issues.map((issue) => ({
                            field: issue.path.join('.'),
                            message: issue.message
                        }))
                    }
                });
                return;
            }

            next(error);
        }
    };

    router.post(
        '/plans',
        requireAuth,
        validate(createProductionPlanSchema),
        (req, res) => controller.createPlan(req, res)
    );

    router.get(
        '/dashboard',
        requireAuth,
        (req, res) => controller.getDashboard(req, res)
    );

    router.put(
        '/plans/:id/status',
        requireAuth,
        validate(updateProductionStatusSchema),
        (req, res) => controller.updateStatus(req, res)
    );

    router.post(
        '/quality/checkpoints',
        requireAuth,
        validate(recordQualityCheckpointSchema),
        (req, res) => controller.recordQuality(req, res)
    );

    router.get(
        '/capacity',
        requireAuth,
        validate(checkCapacitySchema),
        (req, res) => controller.getCapacity(req, res)
    );

    return router;
};
