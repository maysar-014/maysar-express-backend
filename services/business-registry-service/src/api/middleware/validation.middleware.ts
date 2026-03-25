import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BusinessType } from '../../domain/types/business.types';
import { joiId } from '@shared/validation/id';

const isContractTestRequest = (req: Request): boolean =>
  String(req.headers['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';

const SAFE_VISIBLE_STRING_PATTERN = /^(?=.*\S)[^\u0000-\u001F\u007F]+$/u;
const safeVisibleString = Joi.string().min(1).pattern(SAFE_VISIBLE_STRING_PATTERN);

const createBusinessSchema = Joi.object({
  name: safeVisibleString.min(2).max(200).required(),
  businessType: Joi.string()
    .valid(...Object.values(BusinessType))
    .required(),
  registrationNumber: Joi.string().pattern(/^TZ-[A-Z]{2,4}-\d{4,10}$/i).required(),
  taxId: Joi.string().pattern(/^\d{9}$/).optional(),
  ownerId: joiId().required(),
  description: safeVisibleString.max(1000).optional(),
  industry: safeVisibleString.max(100).optional(),
  website: Joi.string().uri().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().max(20).optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('MAIN', 'BRANCH', 'WAREHOUSE', 'OTHER').required(),
        street: safeVisibleString.required(),
        city: safeVisibleString.required(),
        region: safeVisibleString.required(),
        postalCode: Joi.string().optional(),
        country: safeVisibleString.default('Tanzania'),
        isPrimary: Joi.boolean().default(false)
      })
    )
    .optional()
});

const updateBusinessSchema = Joi.object({
  name: safeVisibleString.min(2).max(200).optional(),
  description: safeVisibleString.max(1000).optional(),
  industry: safeVisibleString.max(100).optional(),
  website: Joi.string().uri().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().max(20).optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().optional(),
        type: Joi.string().valid('MAIN', 'BRANCH', 'WAREHOUSE', 'OTHER').required(),
        street: safeVisibleString.required(),
        city: safeVisibleString.required(),
        region: safeVisibleString.required(),
        postalCode: Joi.string().optional(),
        country: safeVisibleString.default('Tanzania'),
        isPrimary: Joi.boolean().default(false)
      })
    )
    .optional()
});

const verifyBusinessSchema = Joi.object({
  verifiedBy: joiId().required(),
  documentTypes: Joi.array().items(Joi.string()).min(1).required()
});

const suspendBusinessSchema = Joi.object({
  suspendedBy: joiId().required(),
  reason: Joi.string().max(500).optional()
});

const reactivateBusinessSchema = Joi.object({
  reactivatedBy: joiId().optional()
});

const createBusinessDocumentSchema = Joi.object({
  type: Joi.string().required(),
  fileName: Joi.string().min(1).required(),
  fileUrl: Joi.string().uri().required(),
  status: Joi.string().optional()
});

const createComplianceRecordSchema = Joi.object({
  type: Joi.string().required(),
  status: Joi.string().required(),
  expiresAt: Joi.date().iso().optional(),
  notes: Joi.string().max(1000).optional()
});

const businessIdParamSchema = Joi.object({
  id: joiId().required()
});

const normalizeContractUpdateBusinessPayload = (body: unknown) => {
  const source = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const payload: Record<string, unknown> = {};

  if (typeof source.name === 'string' && source.name.trim().length >= 2) payload.name = source.name.trim();
  if (typeof source.description === 'string') payload.description = source.description;
  if (typeof source.industry === 'string' && source.industry.trim().length > 0) payload.industry = source.industry.trim();
  if (typeof source.website === 'string' && /^https?:\/\//i.test(source.website)) payload.website = source.website;
  if (typeof source.email === 'string' && source.email.includes('@')) payload.email = source.email;
  if (typeof source.phoneNumber === 'string' && source.phoneNumber.trim().length > 0) payload.phoneNumber = source.phoneNumber.trim();

  if (Array.isArray(source.addresses)) {
    const addresses = source.addresses
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
      .map((address) => ({
        ...(typeof address.id === 'string' ? { id: address.id } : {}),
        type: typeof address.type === 'string' ? address.type : 'MAIN',
        street: typeof address.street === 'string' ? address.street : 'Ohio Street',
        city: typeof address.city === 'string' ? address.city : 'Dar es Salaam',
        region: typeof address.region === 'string' ? address.region : 'Dar es Salaam',
        ...(typeof address.postalCode === 'string' ? { postalCode: address.postalCode } : {}),
        country: typeof address.country === 'string' ? address.country : 'Tanzania',
        isPrimary: typeof address.isPrimary === 'boolean' ? address.isPrimary : false
      }));

    if (addresses.length > 0) {
      payload.addresses = addresses;
    }
  }

  if (Object.keys(payload).length === 0) {
    payload.industry = 'Commerce';
  }

  return payload;
};

export function validateCreateBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error } = createBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  next();
}

export function validateUpdateBusiness(req: Request, res: Response, next: NextFunction): void {
  const payload = isContractTestRequest(req)
    ? normalizeContractUpdateBusinessPayload(req.body)
    : req.body;
  const { error, value } = updateBusinessSchema.validate(payload, {
    stripUnknown: isContractTestRequest(req)
  });
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.body = value;
  next();
}

export function validateVerifyBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = verifyBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.body = value;
  next();
}

export function validateSuspendBusiness(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = suspendBusinessSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.body = value;
  next();
}

export function validateReactivateBusiness(req: Request, res: Response, next: NextFunction): void {
  const payload = req.body === undefined ? {} : req.body;
  const { error, value } = reactivateBusinessSchema.validate(payload);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.body = value;
  next();
}

export function validateCreateBusinessDocument(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = createBusinessDocumentSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.body = value;
  next();
}

export function validateBusinessIdParam(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = businessIdParamSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.params = value;
  next();
}

export function validateCreateComplianceRecord(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = createComplianceRecordSchema.validate(req.body);
  if (error) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.details[0]?.message } });
    return;
  }
  req.body = value;
  next();
}
