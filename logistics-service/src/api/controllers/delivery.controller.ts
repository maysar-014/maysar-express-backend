import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CreateDeliveryUseCase } from '../../application/use-cases/create-delivery.use-case';
import { DependencyContainer } from '../../infrastructure/container';
import { DeliveryDomainService } from '../../domain/services/delivery.domain-service';

export class DeliveryController {
  private createDeliveryUseCase: CreateDeliveryUseCase;
  private deliveryDomainService: DeliveryDomainService;
  private container: DependencyContainer;

  constructor() {
    this.container = DependencyContainer.getInstance();
    this.createDeliveryUseCase = this.container.getCreateDeliveryUseCase();
    this.deliveryDomainService = this.container.getDeliveryDomainService();
  }

  async createDelivery(req: Request, res: Response): Promise<void> {
    try {
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
          lat: req.body.pickupAddress?.coordinates?.lat || -6.7924, // TODO: Implement geocoding - default to Dar es Salaam
          lng: req.body.pickupAddress?.coordinates?.lng || 39.2083, // TODO: Implement geocoding - default to Dar es Salaam
          address: `${req.body.pickupAddress?.street}, ${req.body.pickupAddress?.city}, ${req.body.pickupAddress?.postalCode}, ${req.body.pickupAddress?.country}`
        },
        deliveryLocation: {
          lat: req.body.deliveryAddress?.coordinates?.lat || -6.7924, // TODO: Implement geocoding - default to Dar es Salaam
          lng: req.body.deliveryAddress?.coordinates?.lng || 39.2083, // TODO: Implement geocoding - default to Dar es Salaam
          address: `${req.body.deliveryAddress?.street}, ${req.body.deliveryAddress?.city}, ${req.body.deliveryAddress?.postalCode}, ${req.body.deliveryAddress?.country}`
        },
        weight: req.body.packageDetails?.weight || 1, // Extract weight from packageDetails
        priority: req.body.priority || 'standard',
        timeWindow: req.body.timeWindow ? {
          earliest: new Date(req.body.timeWindow.start),
          latest: new Date(req.body.timeWindow.end)
        } : undefined,
        specialRequirements: req.body.specialRequirements
      };

      const result = await this.createDeliveryUseCase.execute(input);

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

  async getDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId } = req.params;

      // Use repository through proper channels (would be through use case)
      // For now, return mock data
      res.json({
        success: true,
        data: {
          deliveryId,
          status: 'in_transit',
          courier: 'John Mwangi',
          estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000),
          trackingNumber: `TRK${deliveryId.toUpperCase()}`
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERY_FETCH_FAILED',
          message: error.message
        }
      });
    }
  }

  async getDeliveries(req: Request, res: Response): Promise<void> {
    try {
      // Mock delivery list - would use proper use case
      res.json({
        success: true,
        data: {
          deliveries: [
            {
              deliveryId: 'del_001',
              orderId: 'ord_001',
              status: 'delivered',
              courier: 'John Mwangi',
              deliveredAt: new Date()
            },
            {
              deliveryId: 'del_002',
              orderId: 'ord_002',
              status: 'in_transit',
              courier: 'Mary Kimani',
              estimatedDelivery: new Date(Date.now() + 60 * 60 * 1000)
            }
          ],
          total: 2
        }
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
}
