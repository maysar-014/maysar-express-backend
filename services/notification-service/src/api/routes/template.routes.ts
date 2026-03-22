import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { TemplateController } from '../controllers/template.controller';
import { asyncHandler } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rate-limit.middleware';
import { validateJoiRequest } from '@shared/middleware/joi-request-validation';

const NON_BLANK_PATTERN = /^(?=.*\S).+$/;

const templateIdParamsSchema = Joi.object({
  id: Joi.string().min(1).max(100).required(),
}).unknown(false);

const createTemplateBodySchema = Joi.object({
  name: Joi.string().trim().pattern(NON_BLANK_PATTERN).required(),
  content: Joi.string().allow('').optional(),
  type: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  channel: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  subject: Joi.string().allow('').optional(),
  bodyTemplate: Joi.string().allow('').optional(),
  variables: Joi.array().items(Joi.string().trim().pattern(NON_BLANK_PATTERN)).optional(),
  isActive: Joi.boolean().optional(),
}).unknown(false);

const updateTemplateBodySchema = Joi.object({
  name: Joi.string().trim().pattern(NON_BLANK_PATTERN).optional(),
  subject: Joi.string().allow('').optional(),
  bodyTemplate: Joi.string().allow('').optional(),
  variables: Joi.array().items(Joi.string().trim().pattern(NON_BLANK_PATTERN)).optional(),
  isActive: Joi.boolean().optional(),
}).min(1).unknown(false);

const renderTemplateBodySchema = Joi.object({
  variables: Joi.object()
    .pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean(), Joi.valid(null)))
    .optional(),
}).unknown(false);

export function createTemplateRoutes(controller: TemplateController): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(rateLimit({ limit: 50, windowMs: 60000 }));

  router.post(
    '/',
    validateJoiRequest({ body: createTemplateBodySchema }),
    asyncHandler((req: Request, res: Response) => controller.createTemplate(req, res))
  );
  router.get(
    '/:id',
    validateJoiRequest({ params: templateIdParamsSchema }),
    asyncHandler((req: Request, res: Response) => controller.getTemplate(req, res))
  );
  router.put(
    '/:id',
    validateJoiRequest({ params: templateIdParamsSchema, body: updateTemplateBodySchema }),
    asyncHandler((req: Request, res: Response) => controller.updateTemplate(req, res))
  );
  router.delete(
    '/:id',
    validateJoiRequest({ params: templateIdParamsSchema }),
    asyncHandler((req: Request, res: Response) => controller.deleteTemplate(req, res))
  );
  router.post(
    '/:id/render',
    validateJoiRequest({ params: templateIdParamsSchema, body: renderTemplateBodySchema }),
    asyncHandler((req: Request, res: Response) => controller.renderTemplate(req, res))
  );

  return router;
}
