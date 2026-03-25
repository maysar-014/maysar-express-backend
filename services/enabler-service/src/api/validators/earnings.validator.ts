import Joi from 'joi';

export const earningsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'paid', 'on_hold', 'disputed', 'forfeited').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
}).unknown(false);
