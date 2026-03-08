// @ts-nocheck
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CreateDeliveryUseCase } from '../../application/use-cases/create-delivery.use-case';
import { DependencyContainer } from '../../infrastructure/container';
import { DeliveryDomainService } from '../../domain/services/delivery.domain-service';
import { IDeliveryRepository, ICourierRepository } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import { RouteStatus } from '../../domain/enums/route-status.enum';
import { CourierEntity } from '../../domain/entities/courier.entity';

export class DeliveryController {
  private createDeliveryUseCase: CreateDeliveryUseCase | undefined;
  private deliveryDomainService: DeliveryDomainService | undefined;
  private deliveryRepository: IDeliveryRepository | undefined;
  private container: DependencyContainer;

  constructor() {
    this.container = DependencyContainer.getInstance();
  }

  private getCreateDeliveryUseCase(): CreateDeliveryUseCase {
    if (!this.createDeliveryUseCase) {
      this.createDeliveryUseCase = this.container.getCreateDeliveryUseCase();
    }
    return this.createDeliveryUseCase;
  }

  private getDeliveryDomainService(): DeliveryDomainService {
    if (!this.deliveryDomainService) {
      this.deliveryDomainService = this.container.getDeliveryDomainService();
    }
    return this.deliveryDomainService;
  }

  async createDelivery(req: Request, res: Response): Promise<void> {
    try {
      // DEBUG: Log the incoming request
      console.log('ðŸ” DEBUG - Incoming request body:', JSON.stringify(req.body, null, 2));

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors.array()
          }
        });
        return;
      }

      // Transform request data to match CreateDeliveryInput interface
      const input = {
        orderId: req.body.orderId,
        pickupLocation: {
          lat: req.body.pickupAddress?.coordinates?.lat || req.body.pickupAddress?.lat || -6.7924,
          lng: req.body.pickupAddress?.coordinates?.lng || req.body.pickupAddress?.lng || 39.2083,
          address: `${req.body.pickupAddress?.street}, ${req.body.pickupAddress?.city}, ${req.body.pickupAddress?.postalCode}, ${req.body.pickupAddress?.country}`
        },
        deliveryLocation: {
          lat: req.body.deliveryAddress?.coordinates?.lat || req.body.deliveryAddress?.lat || -6.7924,
          lng: req.body.deliveryAddress?.coordinates?.lng || req.body.deliveryAddress?.lng || 39.2083,
          address: `${req.body.deliveryAddress?.street}, ${req.body.deliveryAddress?.city}, ${req.body.deliveryAddress?.postalCode}, ${req.body.deliveryAddress?.country}`
        },
        weight: req.body.packageDetails?.weight || req.body.weight || 1,
        priority: req.body.priority || 'standard',
        timeWindow: req.body.timeWindow ? {
          earliest: new Date(req.body.timeWindow.start),
          latest: new Date(req.body.timeWindow.end)
        } : undefined,
        desiredArrivalTime: req.body.desiredArrivalTime ? new Date(req.body.desiredArrivalTime) : undefined,
        estimatedArrivalMinutes: req.body.estimatedArrivalMinutes,
        specialRequirements: req.body.specialRequirements
      };

      // DEBUG: Log the transformed input
      console.log('ðŸ” DEBUG - Transformed input:', JSON.stringify(input, null, 2));

      // Step 1: Execute use case (handles business logic and validation)
      console.log('ðŸ” DEBUG - About to execute CreateDeliveryUseCase');
      const result = await this.getCreateDeliveryUseCase().execute(input);
      console.log('ðŸ” DEBUG - CreateDeliveryUseCase result:', JSON.stringify(result, null, 2));

      // Step 2: Save the delivery to database
      console.log('ðŸ” DEBUG - Getting delivery repository from container');
      const deliveryRepository = this.container.getDeliveryRepository();
      console.log('ðŸ” DEBUG - Delivery repository obtained:', !!deliveryRepository);

      const deliveryEntity = {
        id: result.deliveryId,
        orderId: input.orderId,
        courierId: result.courierId,
        status: 'assigned' as const,
        pickupLocation: GeoPoint.create(
          input.pickupLocation.lat,
          input.pickupLocation.lng,
          input.pickupLocation.address
        ),
        deliveryLocation: GeoPoint.create(
          input.deliveryLocation.lat,
          input.deliveryLocation.lng,
          input.deliveryLocation.address
        ),
        estimatedPickupTime: result.estimatedPickupTime,
        estimatedDeliveryTime: result.estimatedDeliveryTime,
        weight: input.weight,
        priority: input.priority as 'standard' | 'express' | 'urgent',
        specialRequirements: input.specialRequirements || [],
        routeDistance: result.route.distance,
        routeDuration: result.route.duration,
        totalCost: result.totalCost,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await deliveryRepository.save(deliveryEntity);
      console.log('âœ… Delivery saved to database:', result.deliveryId);

      // Step 3: Create route for the delivery
      try {
        await this.createRouteForDelivery(result.deliveryId, result.courierId, input);
        console.log('âœ… Route created successfully for delivery:', result.deliveryId);
      } catch (routeError) {
        console.error('âŒ Route creation failed:', routeError);
        // Don't fail the entire request if route creation fails - delivery was created successfully
        // Log for monitoring and manual intervention if needed
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'Delivery created successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DELIVERY_CREATION_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  private async createRouteForDelivery(deliveryId: string, courierId: string, deliveryInput: any): Promise<void> {
    try {
      // Use the proper route creation service from container
      const routeCreationService = this.container.getRouteCreationService();
      const routeRepository = this.container.getRouteRepository();
      const courierRepository = this.container.getCourierRepository();

      if (!routeCreationService) {
        console.warn('âš ï¸ RouteCreationService not available, falling back to basic route creation');
        await this.createBasicRoute(deliveryId, courierId, deliveryInput);
        return;
      }

      // Get courier information
      const courier = await courierRepository.findById(courierId);
      if (!courier) {
        throw new Error(`Courier ${courierId} not found`);
      }

      // Create courier entity
      const courierEntity = CourierEntity.create({
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        vehicle: courier.vehicle,
        rating: courier.rating,
        completionRate: courier.completionRate,
        currentLocation: courier.currentLocation,
        isAvailable: courier.isAvailable,
        trafficExperience: courier.trafficExperience
      });

      // Prepare delivery for route creation
      const deliveryForRoute = {
        id: deliveryId,
        pickupLocation: GeoPoint.create(
          deliveryInput.pickupLocation.lat,
          deliveryInput.pickupLocation.lng,
          deliveryInput.pickupLocation.address
        ),
        deliveryLocation: GeoPoint.create(
          deliveryInput.deliveryLocation.lat,
          deliveryInput.deliveryLocation.lng,
          deliveryInput.deliveryLocation.address
        ),
        weight: Weight.fromKilograms(deliveryInput.weight || 1),
        priority: deliveryInput.priority || 'standard',
        timeWindow: deliveryInput.timeWindow ? {
          earliest: new Date(deliveryInput.timeWindow.earliest || deliveryInput.timeWindow.start),
          latest: new Date(deliveryInput.timeWindow.latest || deliveryInput.timeWindow.end)
        } : undefined
      };

      // Use the route creation service to create optimized route
      const routeResult = await routeCreationService.createRouteForSingleDelivery(
        courierEntity,
        deliveryForRoute
      );

      // Save the optimized route
      await routeRepository.save(routeResult.route);

      console.log(`âœ… Optimized route created: ${routeResult.route.getId()} for delivery ${deliveryId}`);
      console.log(`   ðŸ“Š Optimization score: ${routeResult.optimizationScore}%`);
      console.log(`   ðŸ’° Estimated savings: ${routeResult.estimatedSavings.timeMinutes}min, ${routeResult.estimatedSavings.distanceKm}km`);

    } catch (error) {
      console.error('âŒ Route creation failed:', error);
      // Don't fail delivery creation, just log the error
      throw error;
    }
  }

  private async createBasicRoute(deliveryId: string, courierId: string, deliveryInput: any): Promise<void> {
    try {
      const routeRepository = this.container.getRouteRepository();
      const courierRepository = this.container.getCourierRepository();

      // Get courier information
      const courier = await courierRepository.findById(courierId);
      if (!courier) {
        throw new Error(`Courier ${courierId} not found`);
      }

      // Create a basic route entity
      const Route = (await import('../../domain/entities/route.entity')).Route;
      const RouteProgress = (await import('../../domain/value-objects/route-progress.value-object')).RouteProgress;

      const pickupPoint = GeoPoint.create(
        deliveryInput.pickupLocation.lat,
        deliveryInput.pickupLocation.lng,
        deliveryInput.pickupLocation.address
      );

      const deliveryPoint = GeoPoint.create(
        deliveryInput.deliveryLocation.lat,
        deliveryInput.deliveryLocation.lng,
        deliveryInput.deliveryLocation.address
      );

      // Create route progress
      const progress = RouteProgress.create(
        0, // completed stops
        2, // total stops (pickup + delivery)
        pickupPoint, // current location
        new Date(), // last update
        undefined, // estimated completion
        undefined // notes
      );

      // Create route
      const route = Route.create({
        id: `route_${deliveryId}`,
        courierId: courierId,
        status: RouteStatus.PLANNED,
        totalDistance: 10.0, // Basic estimate
        estimatedDuration: 20, // Basic estimate
        waypoints: [pickupPoint, deliveryPoint],
        progress
      });

      // Save the route
      await routeRepository.save(route);

      console.log(`âœ… Basic route created: ${route.getId()} for delivery ${deliveryId}`);

    } catch (error) {
      console.error('âŒ Basic route creation failed:', error);
      throw error;
    }
  }

  async getDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId } = req.params;

      const getDeliveryUseCase = this.container.getGetDeliveryUseCase();
      const delivery = await getDeliveryUseCase.execute({ deliveryId });

      res.json({
        success: true,
        data: delivery
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DELIVERY_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELIVERY_FETCH_FAILED',
            message: error.message
          }
        });
      }
    }
  }

  async getDeliveries(req: Request, res: Response): Promise<void> {
    try {
      // Parse query parameters for filtering and pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      const courierId = req.query.courierId as string;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      const getDeliveriesUseCase = this.container.getGetDeliveriesUseCase();
      const result = await getDeliveriesUseCase.execute({
        page,
        limit,
        status,
        courierId,
        dateFrom,
        dateTo
      });

      res.json({
        success: true,
        data: result,
        message: 'Deliveries retrieved successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERIES_FETCH_FAILED',
          message: error.message
        }
      });
    }
  }

  async updateDeliveryStatus(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const { status, location, recipientName, notes, reason } = req.body;

      const updateDeliveryStatusUseCase = this.container.getUpdateDeliveryStatusUseCase();
      const result = await updateDeliveryStatusUseCase.execute({
        deliveryId,
        status,
        location,
        recipientName,
        notes,
        reason
      });

      res.json({
        success: true,
        data: result,
        message: 'Delivery status updated successfully'
      });
    } catch (error: any) {
      if (error.message.includes('Invalid status transition')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: error.message
          }
        });
      } else if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DELIVERY_NOT_FOUND',
            message: error.message
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'DELIVERY_STATUS_UPDATE_FAILED',
            message: error.message
          }
        });
      }
    }
  }
}
