import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation middleware using Joi schemas
 */

// Create Post Validation Schema
export const createPostValidation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    authorId: Joi.string().uuid().required()
      .messages({
        'string.empty': 'Author ID is required',
        'string.uuid': 'Author ID must be a valid UUID',
        'any.required': 'Author ID is required'
      }),

    content: Joi.string().min(1).max(10000).required()
      .messages({
        'string.empty': 'Content is required',
        'string.min': 'Content cannot be empty',
        'string.max': 'Content cannot exceed 10,000 characters',
        'any.required': 'Content is required'
      }),

    type: Joi.string().valid(
      'text', 'image', 'video', 'link', 'poll', 'event',
      'product_announcement', 'promotion', 'delivery_update',
      'system_notice', 'dispute_clarification', 'question'
    ).required()
      .messages({
        'any.only': 'Invalid post type',
        'any.required': 'Post type is required'
      }),

    title: Joi.string().max(255).optional()
      .messages({
        'string.max': 'Title cannot exceed 255 characters'
      }),

    visibility: Joi.string().valid('public', 'followers', 'private').optional()
      .messages({
        'any.only': 'Visibility must be public, followers, or private'
      }),

    metadata: Joi.object({
      tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        address: Joi.string().max(500).optional()
      }).optional(),
      eventDetails: Joi.object({
        startDate: Joi.date().greater('now').required(),
        endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
        location: Joi.string().max(500).optional(),
        capacity: Joi.number().integer().min(1).optional(),
        rsvpRequired: Joi.boolean().optional()
      }).optional(),
      pollOptions: Joi.array().items(Joi.string().min(1).max(100)).min(2).max(10).optional(),
      relatedProductId: Joi.string().uuid().optional(),
      relatedOrderId: Joi.string().uuid().optional(),
      relatedShipmentId: Joi.string().uuid().optional()
    }).optional()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

// Update Post Validation Schema
export const updatePostValidation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    title: Joi.string().max(255).optional(),
    content: Joi.string().min(1).max(10000).optional(),
    visibility: Joi.string().valid('public', 'followers', 'private').optional(),
    metadata: Joi.object({
      tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      location: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        address: Joi.string().max(500).optional()
      }).optional()
    }).optional()
  }).min(1); // At least one field must be provided

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Request validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

// Search Validation Schema
export const searchValidation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    q: Joi.string().min(1).max(500).required()
      .messages({
        'string.empty': 'Search query is required',
        'string.min': 'Search query cannot be empty',
        'string.max': 'Search query cannot exceed 500 characters',
        'any.required': 'Search query is required'
      }),

    type: Joi.string().valid(
      'text', 'image', 'video', 'link', 'poll', 'event',
      'product_announcement', 'promotion', 'delivery_update',
      'system_notice', 'dispute_clarification', 'question'
    ).optional(),

    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
    offset: Joi.number().integer().min(0).default(0).optional()
  });

  const { error } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Query parameter validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

// Feed Validation Schema
export const feedValidation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50).optional(),
    offset: Joi.number().integer().min(0).default(0).optional(),
    includeFollowed: Joi.boolean().default(true).optional(),
    type: Joi.string().valid(
      'text', 'image', 'video', 'link', 'poll', 'event',
      'product_announcement', 'promotion', 'delivery_update',
      'system_notice', 'dispute_clarification', 'question'
    ).optional()
  });

  const { error } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Query parameter validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

// Pagination Validation Schema
export const paginationValidation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'likesCount', 'commentsCount').default('createdAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional()
  });

  const { error } = schema.validate(req.query, { abortEarly: false });

  if (error) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Pagination parameter validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

// Report Content Validation Schema
export const reportContentValidation = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    reason: Joi.string().valid(
      'spam', 'harassment', 'inappropriate_content', 'copyright_violation',
      'hate_speech', 'misinformation', 'other'
    ).required()
      .messages({
        'any.only': 'Invalid report reason',
        'any.required': 'Report reason is required'
      }),

    description: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Description cannot exceed 1000 characters'
      }),

    entityType: Joi.string().valid('post', 'comment', 'user').optional().default('post'),
    entityId: Joi.string().uuid().required()
      .messages({
        'string.uuid': 'Entity ID must be a valid UUID',
        'any.required': 'Entity ID is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    res.status(400).json({
      error: 'ValidationError',
      message: 'Report validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
    return;
  }

  next();
};

// UUID Parameter Validation Middleware
export const validateUuidParam = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
      [paramName]: Joi.string().uuid().required()
        .messages({
          'string.uuid': `${paramName} must be a valid UUID`,
          'any.required': `${paramName} is required`
        })
    });

    const { error } = schema.validate({ [paramName]: req.params[paramName] });

    if (error) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Parameter validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
      return;
    }

    next();
  };
};

// General Request Sanitization Middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Remove any potential XSS vectors from string inputs
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/<[^>]*>/g, '');
  };

  // Sanitize body strings
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    });
  }

  next();
};
