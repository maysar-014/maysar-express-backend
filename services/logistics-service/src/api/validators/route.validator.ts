// @ts-nocheck
import { body, param, query } from 'express-validator';
import { isSystemId } from '@shared/validation/id';

export class RouteValidator {
  static optimizeRoute(): ValidationChain[] {
    return [
      // Deliveries validation
      body('deliveries')
        .isArray({ min: 1, max: 50 })
        .withMessage('Deliveries must be an array with 1-50 items'),

      body('deliveries.*.deliveryId')
        .custom(isSystemId)
        .withMessage('Each delivery ID must be a valid ID'),

      body('deliveries.*.address')
        .isObject()
        .withMessage('Each delivery must have an address'),

      body('deliveries.*.address.street')
        .isLength({ min: 3, max: 255 })
        .withMessage('Delivery street must be between 3 and 255 characters'),

      body('deliveries.*.address.city')
        .isLength({ min: 2, max: 100 })
        .withMessage('Delivery city must be between 2 and 100 characters'),

      body('deliveries.*.address.postalCode')
        .matches(/^[A-Z0-9\s-]{3,10}$/)
        .withMessage('Invalid delivery postal code format'),

      body('deliveries.*.coordinates')
        .optional()
        .isObject()
        .withMessage('Coordinates must be an object'),

      body('deliveries.*.coordinates.lat')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid delivery latitude'),

      body('deliveries.*.coordinates.lng')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid delivery longitude'),

      body('deliveries.*.priority')
        .optional()
        .isIn(['standard', 'express', 'urgent'])
        .withMessage('Invalid delivery priority level'),

      body('deliveries.*.timeWindow')
        .optional()
        .isObject()
        .withMessage('Delivery time window must be an object'),

      body('deliveries.*.timeWindow.start')
        .optional()
        .isISO8601()
        .withMessage('Delivery time window start must be valid ISO date'),

      body('deliveries.*.timeWindow.end')
        .optional()
        .isISO8601()
        .withMessage('Delivery time window end must be valid ISO date'),

      // Start location validation
      body('startLocation')
        .isObject()
        .withMessage('Start location is required'),

      body('startLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid start latitude'),

      body('startLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid start longitude'),

      body('startLocation.address')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('Start location address must be between 3 and 255 characters'),

      // End location validation (optional)
      body('endLocation')
        .optional()
        .isObject()
        .withMessage('End location must be an object'),

      body('endLocation.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid end latitude'),

      body('endLocation.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid end longitude'),

      // Constraints validation
      body('constraints')
        .optional()
        .isObject()
        .withMessage('Constraints must be an object'),

      body('constraints.maxDistance')
        .optional()
        .isFloat({ min: 1, max: 500 })
        .withMessage('Max distance must be between 1 and 500 km'),

      body('constraints.maxTime')
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage('Max time must be between 15 and 480 minutes'),

      body('constraints.maxStops')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Max stops must be between 1 and 20'),

      body('constraints.vehicleType')
        .optional()
        .isIn(['motorcycle', 'car', 'van', 'truck'])
        .withMessage('Invalid vehicle type'),

      body('constraints.avoidTolls')
        .optional()
        .isBoolean()
        .withMessage('Avoid tolls must be a boolean'),

      body('constraints.avoidHighways')
        .optional()
        .isBoolean()
        .withMessage('Avoid highways must be a boolean'),

      // Optimization preferences
      body('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),

      body('preferences.optimizeFor')
        .optional()
        .isIn(['time', 'distance', 'cost'])
        .withMessage('Optimize for must be time, distance, or cost'),

      body('preferences.trafficAware')
        .optional()
        .isBoolean()
        .withMessage('Traffic aware must be a boolean'),
    ];
  }

  static getRoute(): ValidationChain[] {
    return [
      param('routeId')
        .notEmpty()
        .withMessage('Route ID is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Route ID must be between 1 and 100 characters'),
    ];
  }

  static updateRouteProgress(): ValidationChain[] {
    return [
      param('routeId')
        .custom(isSystemId)
        .withMessage('Route ID must be a valid ID'),

      body('currentLocation')
        .isObject()
        .withMessage('Current location is required'),

      body('currentLocation.latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid current latitude'),

      body('currentLocation.longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid current longitude'),

      body('currentLocation.accuracy')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Accuracy must be between 0 and 100 meters'),

      body('currentLocation.speed')
        .optional()
        .isFloat({ min: 0, max: 200 })
        .withMessage('Speed must be between 0 and 200 km/h'),

      body('currentLocation.heading')
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage('Heading must be between 0 and 360 degrees'),

      body('completedDeliveries')
        .optional()
        .isArray()
        .withMessage('Completed deliveries must be an array'),

      body('completedDeliveries.*')
        .optional()
        .custom(isSystemId)
        .withMessage('Each completed delivery ID must be a valid ID'),

      body('estimatedArrival')
        .optional()
        .isISO8601()
        .withMessage('Invalid estimated arrival time'),

      body('remainingDeliveries')
        .optional()
        .isArray()
        .withMessage('Remaining deliveries must be an array'),

      body('remainingDeliveries.*')
        .optional()
        .custom(isSystemId)
        .withMessage('Each remaining delivery ID must be a valid ID'),

      body('routeStatus')
        .optional()
        .isIn(['active', 'paused', 'completed', 'cancelled'])
        .withMessage('Invalid route status'),

      body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes must not exceed 1000 characters'),
    ];
  }

  static createRoute(): ValidationChain[] {
    return [
      body('deliveryId')
        .custom(isSystemId)
        .withMessage('Delivery ID must be a valid ID'),

      body('courierId')
        .custom(isSystemId)
        .withMessage('Courier ID must be a valid ID'),

      body('waypoints')
        .isArray({ min: 2, max: 50 })
        .withMessage('Waypoints must be an array with 2-50 items'),

      body('waypoints.*.lat')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Invalid waypoint latitude'),

      body('waypoints.*.lng')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Invalid waypoint longitude'),

      body('waypoints.*.address')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('Waypoint address must be between 3 and 255 characters'),

      body('segments')
        .isArray({ min: 1, max: 49 })
        .withMessage('Segments must be an array with 1-49 items'),

      body('segments.*.start')
        .isObject()
        .withMessage('Segment start must be an object'),

      body('segments.*.end')
        .isObject()
        .withMessage('Segment end must be an object'),

      body('segments.*.distance')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Segment distance must be between 0 and 100 km'),

      body('segments.*.duration')
        .isInt({ min: 1, max: 300 })
        .withMessage('Segment duration must be between 1 and 300 minutes'),

      body('segments.*.roadType')
        .isIn(['highway', 'main_road', 'side_street', 'alley'])
        .withMessage('Invalid road type'),

      body('segments.*.trafficLevel')
        .isInt({ min: 0, max: 100 })
        .withMessage('Traffic level must be between 0 and 100'),

      body('totalDistance')
        .isFloat({ min: 0, max: 500 })
        .withMessage('Total distance must be between 0 and 500 km'),

      body('totalDuration')
        .isInt({ min: 1, max: 480 })
        .withMessage('Total duration must be between 1 and 480 minutes'),

      body('efficiency')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Efficiency must be between 0 and 100'),

      body('confidence')
        .isFloat({ min: 0, max: 1 })
        .withMessage('Confidence must be between 0 and 1'),
    ];
  }
}
