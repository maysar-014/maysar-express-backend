import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { isSystemId } from '@shared/ids/id';

/**
 * Validation Middleware
 * Implements comprehensive input validation using express-validator
 */

export class ValidationMiddleware {

  /**
   * Handle validation errors
   */
  static handleValidationErrors() {
    return (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid input data provided',
          details: errors.array().map(err => ({
            field: (err as any).path || (err as any).param || 'unknown',
            message: err.msg,
            value: (err as any).value || 'N/A'
          }))
        });
      }
      next();
    };
  }

  /**
   * Validation rules for order creation
   */
  static validateOrderCreation() {
    return [
      body('customerId')
        .notEmpty()
        .withMessage('Customer ID is required')
        .custom(isSystemId)
        .withMessage('Customer ID must be a valid ID'),

      body('items')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),

      body('items.*.productId')
        .notEmpty()
        .withMessage('Product ID is required for each item')
        .custom(isSystemId)
        .withMessage('Product ID must be a valid ID'),

      body('items.*.quantity')
        .isInt({ min: 1, max: 1000 })
        .withMessage('Quantity must be between 1 and 1000'),

      body('items.*.unitPrice')
        .isFloat({ min: 0.01 })
        .withMessage('Unit price must be greater than 0'),

      body('shippingAddress')
        .notEmpty()
        .withMessage('Shipping address is required'),

      body('shippingAddress.street')
        .notEmpty()
        .withMessage('Street address is required')
        .isLength({ min: 5, max: 255 })
        .withMessage('Street address must be between 5 and 255 characters'),

      body('shippingAddress.city')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),

      body('shippingAddress.country')
        .notEmpty()
        .withMessage('Country is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),

      body('shippingAddress.postalCode')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('Postal code must be between 3 and 20 characters'),

      body('paymentMethod')
        .optional()
        .isIn(['card', 'bank_transfer', 'mobile_money', 'cash_on_delivery'])
        .withMessage('Invalid payment method'),

      body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters'),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Validation rules for order updates
   */
  static validateOrderUpdate() {
    return [
      param('orderId')
        .custom(isSystemId)
        .withMessage('Order ID must be a valid ID'),

      body('status')
        .optional()
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Invalid order status'),

      body('shippingAddress')
        .optional(),

      body('shippingAddress.street')
        .optional()
        .isLength({ min: 5, max: 255 })
        .withMessage('Street address must be between 5 and 255 characters'),

      body('shippingAddress.city')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('City must be between 2 and 100 characters'),

      body('shippingAddress.country')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Country must be between 2 and 100 characters'),

      body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters'),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Validation rules for payment processing
   */
  static validatePayment() {
    return [
      param('orderId')
        .custom(isSystemId)
        .withMessage('Order ID must be a valid ID'),

      body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Payment amount must be greater than 0'),

      body('currency')
        .isIn(['KES', 'USD', 'EUR', 'GBP'])
        .withMessage('Invalid currency'),

      body('paymentMethod')
        .isIn(['card', 'bank_transfer', 'mobile_money'])
        .withMessage('Invalid payment method'),

      body('callbackUrl')
        .optional()
        .isURL()
        .withMessage('Callback URL must be a valid URL'),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Validation rules for order queries
   */
  static validateOrderQuery() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

      query('status')
        .optional()
        .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
        .withMessage('Invalid status filter'),

      query('customerId')
        .optional()
        .custom(isSystemId)
        .withMessage('Customer ID must be a valid ID'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be in ISO 8601 format'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be in ISO 8601 format'),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Validation rules for user registration/authentication
   */
  static validateUserRegistration() {
    return [
      body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),

      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

      body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),

      body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),

      body('phoneNumber')
        .optional()
        .matches(/^\+?[\d\s\-\(\)]+$/)
        .withMessage('Invalid phone number format'),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Validation rules for login
   */
  static validateLogin() {
    return [
      body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),

      body('password')
        .notEmpty()
        .withMessage('Password is required'),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Validation rules for ID parameters
   */
  static validateID(paramName: string = 'id') {
    return [
      param(paramName)
        .custom(isSystemId)
        .withMessage(`${paramName} must be a valid ID`),

      ValidationMiddleware.handleValidationErrors()
    ];
  }

  /**
   * Sanitization middleware for general input cleaning
   */
  static sanitizeInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Additional sanitization beyond what's in security middleware
      if (req.body) {
        ValidationMiddleware.sanitizeObject(req.body);
      }
      if (req.query) {
        ValidationMiddleware.sanitizeObject(req.query);
      }
      next();
    };
  }

  /**
   * Recursive object sanitization helper
   */
  private static sanitizeObject(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Trim whitespace and remove potential XSS
        obj[key] = obj[key].trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else if (typeof obj[key] === 'object') {
        ValidationMiddleware.sanitizeObject(obj[key]);
      }
    }
  }
}
