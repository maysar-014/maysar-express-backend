// @ts-nocheck
import { Router } from 'express';
import { container } from '../../container';
import { TYPES } from '../../types';
import { CampaignController } from '../controllers/campaign.controller';

export function createCampaignRoutes(): Router {
    const router = Router();
    const controller = container.get<CampaignController>(TYPES.CampaignController);

    router.post('/', (req, res) => controller.create(req, res));
    router.get('/', (req, res) => controller.list(req, res));
    router.get('/:id', (req, res) => controller.get(req, res));
    router.put('/:id', (req, res) => controller.update(req, res));
    router.post('/:id/launch', (req, res) => controller.launch(req, res));
    router.post('/:id/pause', (req, res) => controller.pause(req, res));
    router.post('/:id/resume', (req, res) => controller.resume(req, res));
    router.post('/:id/cancel', (req, res) => controller.cancel(req, res));
    router.post('/:id/complete', (req, res) => controller.complete(req, res));

    return router;
}
