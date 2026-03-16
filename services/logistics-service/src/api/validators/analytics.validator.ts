// @ts-nocheck
import { body, param, query } from 'express-validator';
import { isSystemId } from '@shared/validation/id';

export class AnalyticsValidator {
  static getAnalytics(): ValidationChain[] {
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

      query('metrics')
        .optional()
        .isArray()
        .withMessage('Metrics must be an array'),

      query('metrics.*')
        .optional()
        .isIn([
          'total_deliveries',
          'completed_deliveries',
          'average_delivery_time',
          'on_time_delivery_rate',
          'customer_satisfaction',
          'total_revenue',
          'total_commissions',
          'net_profit',
          'active_couriers',
          'average_rating'
        ])
        .withMessage('Invalid metric type'),

      query('groupBy')
        .optional()
        .isIn(['hour', 'day', 'week', 'month', 'region', 'service_type'])
        .withMessage('Invalid group by option'),

      query('region')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Region must be between 2 and 100 characters'),

      query('serviceType')
        .optional()
        .isIn(['standard', 'express', 'urgent'])
        .withMessage('Service type must be standard, express, or urgent'),

      query('courierId')
        .optional()
        .custom(isSystemId)
        .withMessage('Courier ID must be a valid ID'),

      query('format')
        .optional()
        .isIn(['json', 'csv', 'pdf'])
        .withMessage('Format must be json, csv, or pdf'),
    ];
  }

  static getPerformanceMetrics(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['hour', 'day', 'week', 'month', 'quarter', 'year'])
        .withMessage('Period must be hour, day, week, month, quarter, or year'),

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
        .custom(isSystemId)
        .withMessage('Courier ID must be a valid ID'),

      query('region')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Region must be between 2 and 100 characters'),

      query('vehicleType')
        .optional()
        .isIn(['motorcycle', 'car', 'van', 'truck', 'bicycle'])
        .withMessage('Invalid vehicle type'),

      query('includeInactive')
        .optional()
        .isBoolean()
        .withMessage('Include inactive must be a boolean'),

      query('minDeliveries')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Minimum deliveries must be non-negative'),

      query('sortBy')
        .optional()
        .isIn(['rating', 'deliveries', 'earnings', 'efficiency', 'on_time_rate'])
        .withMessage('Invalid sort option'),

      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    ];
  }

  static getCourierAnalytics(): ValidationChain[] {
    return [
      query('courierId')
        .optional()
        .custom(isSystemId)
        .withMessage('Courier ID must be a valid ID'),

      query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'quarter', 'year', 'custom'])
        .withMessage('Period must be day, week, month, quarter, year, or custom'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('metrics')
        .optional()
        .isArray()
        .withMessage('Metrics must be an array'),

      query('metrics.*')
        .optional()
        .isIn([
          'deliveries_completed',
          'average_rating',
          'on_time_delivery_rate',
          'total_earnings',
          'average_delivery_time',
          'customer_satisfaction',
          'distance_traveled',
          'fuel_efficiency',
          'working_hours'
        ])
        .withMessage('Invalid metric type'),

      query('includeBreakdown')
        .optional()
        .isBoolean()
        .withMessage('Include breakdown must be a boolean'),

      query('compareWith')
        .optional()
        .isIn(['previous_period', 'team_average', 'top_performers'])
        .withMessage('Invalid comparison option'),
    ];
  }

  static getOperationalMetrics(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['hour', 'day', 'week', 'month'])
        .withMessage('Period must be hour, day, week, or month'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('region')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Region must be between 2 and 100 characters'),

      query('serviceArea')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Service area must be between 2 and 100 characters'),

      query('timeSlots')
        .optional()
        .isArray()
        .withMessage('Time slots must be an array'),

      query('timeSlots.*')
        .optional()
        .matches(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage('Invalid time slot format (HH:MM-HH:MM)'),

      query('includeWeather')
        .optional()
        .isBoolean()
        .withMessage('Include weather must be a boolean'),

      query('includeTraffic')
        .optional()
        .isBoolean()
        .withMessage('Include traffic must be a boolean'),

      query('peakHoursOnly')
        .optional()
        .isBoolean()
        .withMessage('Peak hours only must be a boolean'),
    ];
  }

  static getFinancialAnalytics(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'quarter', 'year', 'custom'])
        .withMessage('Period must be day, week, month, quarter, year, or custom'),

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
        .isIn([
          'revenue',
          'commissions',
          'payouts',
          'profit',
          'service_type',
          'region',
          'time_period'
        ])
        .withMessage('Invalid breakdown type'),

      query('currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be 3 characters'),

      query('includeProjections')
        .optional()
        .isBoolean()
        .withMessage('Include projections must be a boolean'),

      query('compareWith')
        .optional()
        .isIn(['previous_period', 'budget', 'forecast'])
        .withMessage('Invalid comparison option'),
    ];
  }

  static getCustomerSatisfactionMetrics(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'quarter', 'year'])
        .withMessage('Period must be day, week, month, quarter, or year'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('region')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Region must be between 2 and 100 characters'),

      query('serviceType')
        .optional()
        .isIn(['standard', 'express', 'urgent'])
        .withMessage('Service type must be standard, express, or urgent'),

      query('ratingThreshold')
        .optional()
        .isFloat({ min: 1, max: 5 })
        .withMessage('Rating threshold must be between 1 and 5'),

      query('includeComments')
        .optional()
        .isBoolean()
        .withMessage('Include comments must be a boolean'),

      query('sortBy')
        .optional()
        .isIn(['rating', 'date', 'frequency'])
        .withMessage('Sort by must be rating, date, or frequency'),

      query('filterBy')
        .optional()
        .isIn(['positive', 'negative', 'neutral'])
        .withMessage('Filter by must be positive, negative, or neutral'),
    ];
  }

  static getSystemHealthMetrics(): ValidationChain[] {
    return [
      query('period')
        .optional()
        .isIn(['hour', 'day', 'week', 'month'])
        .withMessage('Period must be hour, day, week, or month'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('metrics')
        .optional()
        .isArray()
        .withMessage('Metrics must be an array'),

      query('metrics.*')
        .optional()
        .isIn([
          'cpu_usage',
          'memory_usage',
          'disk_usage',
          'network_latency',
          'error_rate',
          'response_time',
          'uptime',
          'throughput'
        ])
        .withMessage('Invalid system metric'),

      query('service')
        .optional()
        .isIn(['api', 'database', 'cache', 'messaging', 'all'])
        .withMessage('Service must be api, database, cache, messaging, or all'),

      query('alertsOnly')
        .optional()
        .isBoolean()
        .withMessage('Alerts only must be a boolean'),

      query('threshold')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Threshold must be between 0 and 100'),
    ];
  }

  static generateReport(): ValidationChain[] {
    return [
      query('type')
        .isIn([
          'performance',
          'financial',
          'operational',
          'customer_satisfaction',
          'system_health',
          'comprehensive'
        ])
        .withMessage('Invalid report type'),

      query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'quarter', 'year', 'custom'])
        .withMessage('Period must be day, week, month, quarter, year, or custom'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

      query('format')
        .optional()
        .isIn(['json', 'csv', 'pdf', 'xlsx'])
        .withMessage('Format must be json, csv, pdf, or xlsx'),

      query('includeCharts')
        .optional()
        .isBoolean()
        .withMessage('Include charts must be a boolean'),

      query('recipients')
        .optional()
        .isArray()
        .withMessage('Recipients must be an array'),

      query('recipients.*')
        .optional()
        .isEmail()
        .withMessage('Each recipient must be a valid email'),

      query('schedule')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'quarterly'])
        .withMessage('Schedule must be daily, weekly, monthly, or quarterly'),
    ];
  }
}
