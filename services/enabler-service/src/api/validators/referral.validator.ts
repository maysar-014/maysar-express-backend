import Joi from 'joi';

const NON_BLANK_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;

export const referralQuerySchema = Joi.object({
  includeQR: Joi.boolean().optional()
}).unknown(false);

export const generateReferralBodySchema = Joi.object({
  includeQR: Joi.boolean().optional(),
  landingPath: Joi.string().trim().pattern(/^\/[A-Za-z0-9\-._~/?=&%]*$/).optional(),
  campaignName: Joi.string().max(120).pattern(NON_BLANK_PATTERN).optional()
}).unknown(false);

export const trackReferralEventBodySchema = Joi.object({
  eventType: Joi.string().valid('click', 'signup', 'checkout', 'conversion').required()
}).unknown(false);
