// @ts-nocheck
import { body, param, query } from 'express-validator';

export class TrackingValidator {
  static storeLocationUpdate(): ValidationChain[] {
    return [
      body('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

      body('location')
        .isObject()
        .withMessage('Location is required'),

      body('location.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid latitude'),

      body('location.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid longitude'),

      body('location.address')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('Location address must be between 3 and 255 characters'),

      body('location.accuracy')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Accuracy must be between 0 and 100 meters'),

      body('speed')
        .optional()
        .isFloat({ min: 0, max: 200 })
        .withMessage('Speed must be between 0 and 200 km/h'),

      body('heading')
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage('Heading must be between 0 and 360 degrees'),

      body('batteryLevel')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Battery level must be between 0 and 100'),

      body('status')
        .optional()
        .isIn(['moving', 'stopped', 'idle', 'offline'])
        .withMessage('Invalid status'),

      body('deliveryId')
        .optional()
        .isUUID()
        .withMessage('Delivery ID must be a valid UUID'),

      body('timestamp')
        .optional()
        .isISO8601()
        .withMessage('Timestamp must be a valid ISO date'),

      body('deviceInfo')
        .optional()
        .isObject()
        .withMessage('Device info must be an object'),

      body('deviceInfo.deviceId')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Device ID must be between 1 and 100 characters'),

      body('deviceInfo.appVersion')
        .optional()
        .matches(/^\d+\.\d+\.\d+$/)
        .withMessage('Invalid app version format'),

      body('deviceInfo.os')
        .optional()
        .isIn(['android', 'ios'])
        .withMessage('OS must be android or ios'),
    ];
  }

  static getTrackingHistory(): ValidationChain[] {
    return [
      param('trackingNumber')
        .isLength({ min: 8, max: 50 })
        .withMessage('Tracking number must be between 8 and 50 characters'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),

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

  static getCourierLocationHistory(): ValidationChain[] {
    return [
      param('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

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

      query('includeAccuracy')
        .optional()
        .isBoolean()
        .withMessage('Include accuracy must be a boolean'),

      query('minAccuracy')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Minimum accuracy must be between 0 and 100'),

      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

      query('limit')
        .optional()
        .isInt({ min: 1, max: 500 })
        .withMessage('Limit must be between 1 and 500'),
    ];
  }

  static getLiveTracking(): ValidationChain[] {
    return [
      param('deliveryId')
        .matches(/^(del_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Delivery ID must be a valid identifier'),

      query('includeHistory')
        .optional()
        .isBoolean()
        .withMessage('Include history must be a boolean'),

      query('historyMinutes')
        .optional()
        .isInt({ min: 1, max: 120 })
        .withMessage('History minutes must be between 1 and 120'),
    ];
  }

  static getFleetTracking(): ValidationChain[] {
    return [
      query('courierIds')
        .optional()
        .isArray()
        .withMessage('Courier IDs must be an array'),

      query('courierIds.*')
        .optional()
        .isUUID()
        .withMessage('Each courier ID must be a valid UUID'),

      query('status')
        .optional()
        .isIn(['active', 'inactive', 'offline'])
        .withMessage('Status must be active, inactive, or offline'),

      query('vehicleType')
        .optional()
        .isIn(['motorcycle', 'car', 'van', 'truck'])
        .withMessage('Invalid vehicle type'),

      query('serviceArea')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Service area must be between 2 and 100 characters'),

      query('bounds')
        .optional()
        .isObject()
        .withMessage('Bounds must be an object'),

      query('bounds.northEast')
        .optional()
        .isObject()
        .withMessage('North east bounds required'),

      query('bounds.northEast.lat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid north east latitude'),

      query('bounds.northEast.lng')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid north east longitude'),

      query('bounds.southWest')
        .optional()
        .isObject()
        .withMessage('South west bounds required'),

      query('bounds.southWest.lat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid south west latitude'),

      query('bounds.southWest.lng')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid south west longitude'),
    ];
  }

  static updateTrackingStatus(): ValidationChain[] {
    return [
      param('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

      body('status')
        .isIn(['online', 'offline', 'busy', 'maintenance'])
        .withMessage('Invalid status'),

      body('reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters'),

      body('maintenanceType')
        .optional()
        .isIn(['scheduled', 'emergency', 'break'])
        .withMessage('Invalid maintenance type'),

      body('estimatedReturnTime')
        .optional()
        .isISO8601()
        .withMessage('Estimated return time must be valid ISO date'),
    ];
  }

  static getTrackingAnalytics(): ValidationChain[] {
    return [
      param('courierId')
        .matches(/^(courier_)?[a-zA-Z0-9_-]+$/)
        .withMessage('Courier ID must be a valid identifier'),

      query('period')
        .optional()
        .isIn(['day', 'week', 'month', 'year'])
        .withMessage('Period must be day, week, month, or year'),

      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be valid ISO date'),

      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be valid ISO date'),

      query('metrics')
        .optional()
        .isArray()
        .withMessage('Metrics must be an array'),

      query('metrics.*')
        .optional()
        .isIn(['distance', 'speed', 'accuracy', 'battery', 'connectivity'])
        .withMessage('Invalid metric type'),
    ];
  }
}
