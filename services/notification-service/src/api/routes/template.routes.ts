import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';

export function createTemplateRoutes(controller: TemplateController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(rateLimit({ limit: 50, windowMs: 60000 }));

  router.post('/', asyncHandler((req, res) => controller.createTemplate(req, res)));
  router.get('/:id', asyncHandler((req, res) => controller.getTemplate(req, res)));
  router.put('/:id', asyncHandler((req, res) => controller.updateTemplate(req, res)));
  router.delete('/:id', asyncHandler((req, res) => controller.deleteTemplate(req, res)));
  router.post('/:id/render', asyncHandler((req, res) => controller.renderTemplate(req, res)));

  return router;
}
