import { Request, Response } from 'express';
import { DependencyContainer } from '../../infrastructure/container';
import { ICourierRepository } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class CourierController {
  private get courierRepository(): ICourierRepository {
    return DependencyContainer.getInstance().getCourierRepository();
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
        status: courier.isAvailable ? 'active' : 'inactive',
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

      const courier = await this.courierRepository.getCourierById(courierId);

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
          status: courier.isAvailable ? 'active' : 'inactive',
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
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve courier'
      });
    }
  }

  async updateCourierStatus(req: Request, res: Response): Promise<void> {
    try {
      const { courierId } = req.params;
      const { status } = req.body;

      // Find the courier first
      const courier = await this.courierRepository.getCourierById(courierId);

      if (!courier) {
        res.status(404).json({
          success: false,
          error: 'Courier not found'
        });
        return;
      }

      // Update availability status
      const isAvailable = status === 'active';
      await this.courierRepository.updateCourierAvailability(courierId, isAvailable);

      res.json({
        success: true,
        data: {
          courierId,
          status,
          updatedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Error updating courier status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update courier status'
      });
    }
  }
}
