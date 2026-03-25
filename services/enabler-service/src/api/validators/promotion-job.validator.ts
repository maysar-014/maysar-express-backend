import Joi from 'joi';
import { joiId } from '@shared/validation/id';

const NON_BLANK_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;

export const promotionJobsQuerySchema = Joi.object({
  view: Joi.string().valid('available', 'accepted', 'all').optional(),
  sellerId: joiId().optional(),
  status: Joi.string().valid('ACTIVE', 'SCHEDULED').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
}).unknown(false);

export const acceptPromotionJobBodySchema = Joi.object({
  note: Joi.string().trim().max(500).pattern(NON_BLANK_PATTERN).optional()
}).unknown(false);
