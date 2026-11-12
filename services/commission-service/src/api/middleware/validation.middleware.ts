/**
 * Validation Middleware
 * Input validation for API requests
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { joiId, isSystemId } from '@shared/validation/id';
import { isOrderNumber } from '@shared/ids/human-readable-ids';

/**
 * Accept both system IDs (ULID/UUID/CUID) and human-readable order numbers (ORD-YYYYMMDD-NLNL).
 */
const joiOrderOrSystemId = (message = 'Invalid ID format') =>
  Joi.string()
    .custom((value, helpers) => {
      if (isSystemId(value) || isOrderNumber(value)) return value;
      return helpers.error('any.invalid');
    })
    .messages({ 'any.invalid': message });

// Commission calculation validation schema
export const validateCalculateCommission = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    orderId: joiOrderOrSystemId().required(),
    sellerId: joiId().required(),
    orderAmount: Joi.number().positive().precision(2).required(),
    recipientType: Joi.string().valid('seller', 'courier', 'enabler', 'customer').required(),
    commissionType: Joi.string().valid(
      'sale', 'referral', 'bonus', 'adjustment',
      'task_assignment', 'task_completion', 'collaboration_setup'
    ).required(),
    baseRate: Joi.number().min(0).max(1).optional(),
    performanceBonus: Joi.number().min(0).max(1).optional(),
    qualityMetrics: Joi.object({
      rating: Joi.number().min(1).max(5).optional(),
      onTimeDelivery: Joi.boolean().optional(),
      customerSatisfaction: Joi.number().min(1).max(5).optional()
    }).optional(),
    specialConditions: Joi.object({
      firstOrder: Joi.boolean().optional(),
      bulkOrder: Joi.boolean().optional(),
      promotionalPeriod: Joi.boolean().optional()
    }).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
    return;
  }

  next();
};

// Commission approval validation schema
export const validateApproveCommission = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    autoSchedulePayout: Joi.boolean().optional()
  });

  const { error: bodyError } = schema.validate(req.body);
  if (bodyError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: bodyError.details.map(detail => detail.message)
    });
    return;
  }

  // Validate commission ID parameter
  const paramSchema = Joi.object({
    id: joiId().required()
  });

  const { error: paramError } = paramSchema.validate(req.params);
  if (paramError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: paramError.details.map(detail => detail.message)
    });
    return;
  }

  next();
};

// Commission query validation schema
export const validateCommissionQuery = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    status: Joi.string().valid(
      'pending', 'approved', 'paid', 'rejected', 'cancelled', 'earned'
    ).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  });

  const { error } = schema.validate(req.query);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
    return;
  }

  next();
};

// Seller ID parameter validation
export const validateSellerId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    sellerId: joiId().required()
  });

  const { error } = schema.validate(req.params);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
    return;
  }

  next();
};

// Commission ID parameter validation
export const validateCommissionId = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    id: joiId().required()
  });

  const { error } = schema.validate(req.params);
  if (error) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
    return;
  }

  next();
};
