import { body, param, query, ValidationChain } from 'express-validator';

export class EarningsValidator {
  static recordEarnings(): ValidationChain[] {
    return [
      body('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

      body('deliveryId')
        .matches(/^(del_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Delivery ID must be a valid identifier'),

      body('baseFare')
        .isFloat({ min: 0 })
        .withMessage('Base fare must be non-negative'),

      body('distanceFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Distance fee must be non-negative'),

      body('weightFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Weight fee must be non-negative'),

      body('priorityFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Priority fee must be non-negative'),

      body('totalEarnings')
        .isFloat({ min: 0 })
        .withMessage('Total earnings must be non-negative'),

      body('commission')
        .isFloat({ min: 0 })
        .withMessage('Commission must be non-negative'),

      body('netEarnings')
        .isFloat({ min: 0 })
        .withMessage('Net earnings must be non-negative'),

      body('paymentStatus')
        .isIn(['pending', 'paid', 'failed'])
        .withMessage('Payment status must be pending, paid, or failed'),

      body('paymentDate')
        .optional()
        .isISO8601()
        .withMessage('Payment date must be a valid ISO date'),

      body('bonuses')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Bonuses must be non-negative'),

      body('deductions')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Deductions must be non-negative'),

      body('currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be 3 characters'),

      body('specialFees')
        .optional()
        .isArray()
        .withMessage('Special fees must be an array'),

      body('specialFees.*.type')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Fee type must be between 1 and 50 characters'),

      body('specialFees.*.amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Fee amount must be non-negative'),

      body('specialFees.*.description')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Fee description must not exceed 200 characters'),
    ];
  }

  static getEarnings(): ValidationChain[] {
    return [
      param('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

      query('period')
        .optional()
        .isIn(['today', 'week', 'month', 'year', 'custom'])
        .withMessage('Period must be today, week, month, year, or custom'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('status')
        .optional()
        .isIn(['pending', 'paid', 'failed'])
        .withMessage('Status must be pending, paid, or failed'),

      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    ];
  }

  static updatePaymentStatus(): ValidationChain[] {
    return [
      param('earningsId')
        .isUUID()
        .withMessage('Earnings ID must be a valid UUID'),

      body('status')
        .isIn(['pending', 'paid', 'failed'])
        .withMessage('Status must be pending, paid, or failed'),

      body('paymentDate')
        .optional()
        .isISO8601()
        .withMessage('Payment date must be a valid ISO date'),

      body('paymentMethod')
        .optional()
        .isIn(['bank_transfer', 'mobile_money', 'cash', 'card'])
        .withMessage('Invalid payment method'),

      body('transactionId')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Transaction ID must be between 1 and 100 characters'),

      body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters'),
    ];
  }

  static calculateCommissions(): ValidationChain[] {
    return [
      body('deliveries')
        .isArray({ min: 1, max: 100 })
        .withMessage('Deliveries must be an array with 1-100 items'),

      body('deliveries.*.deliveryId')
        .matches(/^(del_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Each delivery ID must be a valid identifier'),

      body('deliveries.*.amount')
        .isFloat({ min: 0 })
        .withMessage('Each delivery amount must be non-negative'),

      body('deliveries.*.courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Each courier ID must be a valid identifier'),

      body('commissionRate')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('Commission rate must be between 0 and 1'),

      body('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly'])
        .withMessage('Period must be daily, weekly, or monthly'),

      body('specialRates')
        .optional()
        .isObject()
        .withMessage('Special rates must be an object'),

      body('specialRates.*')
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage('Special rates must be between 0 and 1'),
    ];
  }

  static getEarningsSummary(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['today', 'week', 'month', 'year', 'custom'])
        .withMessage('Period must be today, week, month, year, or custom'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('courierId')
        .optional()
        .isUUID()
        .withMessage('Courier ID must be a valid UUID'),

      query('groupBy')
        .optional()
        .isIn(['day', 'week', 'month', 'courier'])
        .withMessage('Group by must be day, week, month, or courier'),

      query('includePending')
        .optional()
        .isBoolean()
        .withMessage('Include pending must be a boolean'),

      query('currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be 3 characters'),
    ];
  }

  static getPlatformEarnings(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'year', 'custom'])
        .withMessage('Period must be day, week, month, year, or custom'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('breakdown')
        .optional()
        .isArray()
        .withMessage('Breakdown must be an array'),

      query('breakdown.*')
        .optional()
        .isIn(['revenue', 'commissions', 'payouts', 'profit', 'deliveries'])
        .withMessage('Invalid breakdown metric'),

      query('region')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Region must be between 2 and 100 characters'),

      query('serviceType')
        .optional()
        .isIn(['standard', 'express', 'urgent'])
        .withMessage('Service type must be standard, express, or urgent'),
    ];
  }

  static processBulkPayments(): ValidationChain[] {
    return [
      body('payments')
        .isArray({ min: 1, max: 100 })
        .withMessage('Payments must be an array with 1-100 items'),

      body('payments.*.earningsId')
        .isUUID()
        .withMessage('Each earnings ID must be a valid UUID'),

      body('payments.*.amount')
        .isFloat({ min: 0 })
        .withMessage('Each payment amount must be non-negative'),

      body('payments.*.paymentMethod')
        .isIn(['bank_transfer', 'mobile_money', 'cash', 'card'])
        .withMessage('Invalid payment method'),

      body('paymentDate')
        .optional()
        .isISO8601()
        .withMessage('Payment date must be a valid ISO date'),

      body('batchReference')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('Batch reference must be between 1 and 50 characters'),

      body('processedBy')
        .optional()
        .isUUID()
        .withMessage('Processed by must be a valid user ID'),
    ];
  }

  static getCourierEarningsReport(): ValidationChain[] {
    return [
      param('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

      query('period')
        .optional()
        .isIn(['week', 'month', 'quarter', 'year'])
        .withMessage('Period must be week, month, quarter, or year'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('includeDetails')
        .optional()
        .isBoolean()
        .withMessage('Include details must be a boolean'),

      query('format')
        .optional()
        .isIn(['json', 'pdf', 'csv'])
        .withMessage('Format must be json, pdf, or csv'),
    ];
  }
}
