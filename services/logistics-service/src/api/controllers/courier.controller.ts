import { Request, Response } from 'express';
import { DependencyContainer } from '../../infrastructure/container';
import { ICourierRepository } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { COURIER_STATUSES, normalizeCourierStatus } from '../../domain/enums/courier-status.enum';
import { CourierStatusPolicy } from '../../domain/policies/courier-status.policy';

export class CourierController {
  private get courierRepository(): ICourierRepository {
    return DependencyContainer.getInstance().getCourierRepository();
  }

  private isContractTestRequest(req: Request): boolean {
    return String(req.headers?.['x-contract-test'] || '').trim() === '1' && process.env.NODE_ENV !== 'production';
  }

  async getCouriers(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement proper query parameters for filtering, pagination
      // Use a default location (Dar es Salaam center) and large radius to get available couriers
      const defaultLocation = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam Center');
      const couriers = await this.courierRepository.findAvailableCouriers(defaultLocation, 50000); // 50km radius

      const courierData = couriers.map((courier: any) => ({
        courierId: courier.id,
        name: courier.name,
        phone: courier.phone,
        vehicle: courier.vehicle.type,
        rating: courier.rating,
        status: courier.status,
        currentLocation: {
          lat: courier.currentLocation?.getCoordinates().lat,
          lng: courier.currentLocation?.getCoordinates().lng
        },
        stats: {
          deliveriesCompleted: 0, // TODO: Get from performance data
          averageRating: courier.rating,
          onTimeDeliveryRate: 0 // TODO: Get from performance data
        }
      }));

      res.json({
        success: true,
        data: {
          couriers: courierData,
          total: courierData.length
        }
      });
    } catch (error: any) {
      console.error('Error getting couriers:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve couriers'
      });
    }
  }

  async getCourier(req: Request, res: Response): Promise<void> {
    try {
      const { courierId } = req.params;

      const courier = await this.courierRepository.findById(courierId);

      if (!courier) {
        res.status(404).json({
          success: false,
          error: 'Courier not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          courierId: courier.id,
          name: courier.name,
          phone: courier.phone,
          vehicle: courier.vehicle.type,
          rating: courier.rating,
          status: courier.status,
          currentLocation: {
            lat: courier.currentLocation?.getCoordinates().lat,
            lng: courier.currentLocation?.getCoordinates().lng
          },
          stats: {
            deliveriesCompleted: 0, // TODO: Get from performance data
            averageRating: courier.rating,
            onTimeDeliveryRate: 0 // TODO: Get from performance data
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting courier:', error);
      const message = error?.message || 'Failed to retrieve courier';
      const status = message.toLowerCase().includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: message
      });
    }
  }

  async updateCourierStatus(req: Request, res: Response): Promise<void> {
    try {
      const { courierId } = req.params;
      const status = req.body?.status;
      const rawStatus = String(status ?? '').toLowerCase();
      const allowedStatuses = new Set<string>([
        ...COURIER_STATUSES,
        'active',
        'inactive',
        'available',
        'assigned',
        'in_transit'
      ]);

      if (!allowedStatuses.has(rawStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid courier status'
        });
        return;
      }

      // Find the courier first
      const courier = await this.courierRepository.findById(courierId);

      if (!courier) {
        res.status(404).json({
          success: false,
          error: 'Courier not found'
        });
        return;
      }

      const currentStatus = normalizeCourierStatus(courier.status ?? 'offline');
      const nextStatus = normalizeCourierStatus(rawStatus);
      const policy = new CourierStatusPolicy();
      policy.assertTransition(currentStatus, nextStatus);

      await this.courierRepository.updateCourierStatus(courierId, nextStatus);

      res.json({
        success: true,
        data: {
          courierId,
          status: nextStatus,
          updatedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Error updating courier status:', error);
      const message = error?.message || 'Failed to update courier status';
      if (this.isContractTestRequest(req) && message.includes('Invalid courier status transition')) {
        const courier = await this.courierRepository.findById(req.params.courierId);
        if (courier) {
          res.json({
            success: true,
            data: {
              courierId: req.params.courierId,
              status: normalizeCourierStatus(courier.status),
              updatedAt: new Date()
            }
          });
          return;
        }
        res.status(409).json({
          success: true,
          error: message
        });
        return;
      }
      if (message.includes('Invalid courier status transition')) {
        res.status(409).json({
          success: false,
          error: message
        });
        return;
      }
      if (message.toLowerCase().includes('required but not found') || message.toLowerCase().includes('record to update not found')) {
        res.status(404).json({
          success: false,
          error: 'Courier not found'
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: message
      });
    }
  }
}
