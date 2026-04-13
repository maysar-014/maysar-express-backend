import Joi from 'joi';

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F-\u009F]+$/u;

export const submitKycBodySchema = Joi.object({
  fullName: Joi.string().min(2).max(200).required(),
  nationalId: Joi.string().min(2).max(128).required(),
  businessName: Joi.string().min(2).max(200).optional(),
  documents: Joi.array().items(Joi.string().uri()).optional()
}).unknown(false);

export const adminVerifyKycBodySchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  kycLevel: Joi.number().integer().min(1).max(3).when('action', {
    is: 'approve',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  reason: Joi.string().min(3).max(500).pattern(SAFE_VISIBLE_STRING_PATTERN).when('action', {
    is: 'reject',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
}).unknown(false);
