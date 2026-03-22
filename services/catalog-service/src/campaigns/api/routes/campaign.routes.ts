// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { container } from '../../container';
import { TYPES } from '../../types';
import { CampaignController } from '../controllers/campaign.controller';
import { asyncHandler } from '@shared/middleware/async-handler';
import { requireAuth, requireRole } from '@shared/middleware/auth-context.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { CreateCampaignSchema, UpdateCampaignSchema } from '../validators/campaign.validator';

const campaignIdParamSchema = z.object({
    id: z.string().min(1)
}).strict();

const emptyObjectBodySchema = z.object({}).strict().default({});

export function createCampaignRoutes(): Router {
    const router = Router();
    const controller = container.get<CampaignController>(TYPES.CampaignController);

    router.use(requireAuth);

    router.post(
        '/',
        requireRole(['seller', 'admin']),
        validateRequest(CreateCampaignSchema),
        asyncHandler((req, res) => controller.create(req.body, req, res))
    );
    router.get('/', asyncHandler((req, res) => controller.list(req, res)));
    router.get(
        '/:id',
        validateRequest(campaignIdParamSchema, 'params'),
        asyncHandler((req, res) => controller.get(req.params.id, res))
    );
    router.put(
        '/:id',
        requireRole(['seller', 'admin']),
        validateRequest(campaignIdParamSchema, 'params'),
        validateRequest(UpdateCampaignSchema.default({})),
        asyncHandler((req, res) => controller.update(req, res))
    );
    router.post(
        '/:id/launch',
        requireRole(['seller', 'admin']),
        validateRequest(campaignIdParamSchema, 'params'),
        validateRequest(emptyObjectBodySchema),
        asyncHandler((req, res) => controller.launch(req, res))
    );
    router.post(
        '/:id/pause',
        requireRole(['seller', 'admin']),
        validateRequest(campaignIdParamSchema, 'params'),
        validateRequest(emptyObjectBodySchema),
        asyncHandler((req, res) => controller.pause(req, res))
    );
    router.post(
        '/:id/resume',
        requireRole(['seller', 'admin']),
        validateRequest(campaignIdParamSchema, 'params'),
        validateRequest(emptyObjectBodySchema),
        asyncHandler((req, res) => controller.resume(req, res))
    );
    router.post(
        '/:id/cancel',
        requireRole(['seller', 'admin']),
        validateRequest(campaignIdParamSchema, 'params'),
        validateRequest(emptyObjectBodySchema),
        asyncHandler((req, res) => controller.cancel(req.params.id, res))
    );
    router.post(
        '/:id/complete',
        requireRole(['admin']),
        validateRequest(campaignIdParamSchema, 'params'),
        validateRequest(emptyObjectBodySchema),
        asyncHandler((req, res) => controller.complete(req, res))
    );

    return router;
}
