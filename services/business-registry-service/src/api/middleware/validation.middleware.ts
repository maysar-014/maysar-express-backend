import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BusinessType } from '../../domain/types/business.types';

const createBusinessSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  businessType: Joi.string()
    .valid(...Object.values(BusinessType))
    .required(),
  registrationNumber: Joi.string().pattern(/^TZ-[A-Z]{2,4}-\d{4,10}$/i).required(),
  taxId: Joi.string().pattern(/^\d{9}$/).optional(),
  ownerId: Joi.string().required(),
  description: Joi.string().max(1000).optional(),
  industry: Joi.string().max(100).optional(),
  website: Joi.string().uri().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().max(20).optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('MAIN', 'BRANCH', 'WAREHOUSE', 'OTHER').required(),
        street: Joi.string().required(),
        city: Joi.string().required(),
        region: Joi.string().required(),
        postalCode: Joi.string().optional(),
        country: Joi.string().default('Tanzania'),
        isPrimary: Joi.boolean().default(false)
      })
    )
    .optional()
});

const updateBusinessSchema = Joi.object({
  name: Joi.string().min(2).max(200).optional(),
  description: Joi.string().max(1000).optional(),
  industry: Joi.string().max(100).optional(),
  website: Joi.string().uri().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().max(20).optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().optional(),
        type: Joi.string().valid('MAIN', 'BRANCH', 'WAREHOUSE', 'OTHER').required(),
        street: Joi.string().required(),
        city: Joi.string().required(),
        region: Joi.string().required(),
        postalCode: Joi.string().optional(),
        country: Joi.string().default('Tanzania'),
        isPrimary: Joi.boolean().default(false)
      })
    )
    .optional()
});

const verifyBusinessSchema = Joi.object({
  verifiedBy: Joi.string().required(),
  documentTypes: Joi.array().items(Joi.string()).min(1).required()
});

const suspendBusinessSchema = Joi.object({
  suspendedBy: Joi.string().required(),
  reason: Joi.string().max(500).optional()
});

export function validateCreateBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error } = createBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  next();
}

export function validateUpdateBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error } = updateBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  next();
}

export function validateVerifyBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error } = verifyBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  next();
}

export function validateSuspendBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error } = suspendBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  next();
}
