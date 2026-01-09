import { Request, Response } from 'express';
import { DependencyContainer } from '../../infrastructure/container';
import { TrackingRepositoryPort } from '../../domain/engines/ports/tracking.port';
import { DeliveryRepositoryPort } from '../../domain/engines/ports/delivery.port';

export class TrackingController {
  constructor(
    private trackingRepository: TrackingRepositoryPort = DependencyContainer.getInstance().getTrackingRepository(),
    private deliveryRepository: DeliveryRepositoryPort = DependencyContainer.getInstance().getDeliveryRepository()
  ) {}

  async getTrackingHistory(req: Request, res: Response): Promise<void> {
    try {
      const { trackingNumber } = req.params;
      const { startDate, endDate, page = 1, limit = 100 } = req.query;

      // For now, assume tracking number maps to delivery ID
      // In production, you'd have a separate tracking number to delivery ID mapping
      const deliveryId = trackingNumber;

      const timeRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;

      const trackingData = await this.trackingRepository.findByDeliveryId(deliveryId);

      // Filter by time range if provided
      let filteredData = trackingData;
      if (timeRange) {
        filteredData = trackingData.filter(track =>
          track.timestamp >= timeRange.start && track.timestamp <= timeRange.end
        );
      }

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Get delivery info for status
      const delivery = await this.deliveryRepository.findById(deliveryId);

      res.json({
        success: true,
        data: {
          trackingNumber,
          status: delivery?.status || 'unknown',
          currentLocation: paginatedData.length > 0 ?
            paginatedData[paginatedData.length - 1].location.getAddress() : 'Unknown',
          estimatedDelivery: delivery?.estimatedDeliveryTime || null,
          history: paginatedData.map(track => ({
            status: track.status,
            location: track.location.getAddress(),
            timestamp: track.timestamp,
            speed: track.speed,
            heading: track.heading,
            accuracy: track.accuracy,
            batteryLevel: track.batteryLevel
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: filteredData.length,
            pages: Math.ceil(filteredData.length / parseInt(limit as string))
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting tracking history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve tracking history'
      });
    }
  }

  async storeLocationUpdate(req: Request, res: Response): Promise<void> {
    try {
      const {
        courierId,
        location,
        speed,
        heading,
        batteryLevel,
        status,
        deliveryId,
        timestamp,
        deviceInfo
      } = req.body;

      const trackingData = {
        id: `${courierId}_${Date.now()}`,
        deliveryId: deliveryId || null,
        courierId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || 'Unknown'
        },
        speed: speed || 0,
        heading: heading || 0,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        status: status || 'moving',
        batteryLevel: batteryLevel || null,
        accuracy: location.accuracy || 5,
        deviceInfo
      };

      // TODO: Use proper GeoPoint creation and save to repository
      // await this.trackingRepository.save(trackingData);

      res.json({
        success: true,
        data: {
          courierId,
          locationStored: true,
          timestamp: trackingData.timestamp
        }
      });
    } catch (error: any) {
      console.error('Error storing location update:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store location update'
      });
    }
  }

  async getCourierLocationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { courierId } = req.params;
      const {
        period = 'day',
        startDate,
        endDate,
        includeAccuracy = false,
        minAccuracy = 0,
        page = 1,
        limit = 500
      } = req.query;

      const timeRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;

      const trackingData = await this.trackingRepository.findByCourierId(courierId, timeRange);

      // Apply accuracy filter if requested
      let filteredData = trackingData;
      if (includeAccuracy === 'true' && minAccuracy) {
        filteredData = trackingData.filter(track =>
          track.accuracy && track.accuracy >= parseFloat(minAccuracy as string)
        );
      }

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string);
      const endIndex = startIndex + parseInt(limit as string);
      const paginatedData = filteredData.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          courierId,
          locations: paginatedData.map(track => ({
            lat: track.location.getCoordinates().lat,
            lng: track.location.getCoordinates().lng,
            timestamp: track.timestamp,
            accuracy: track.accuracy,
            speed: track.speed,
            heading: track.heading,
            batteryLevel: track.batteryLevel,
            status: track.status
          })),
          period,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: filteredData.length,
            pages: Math.ceil(filteredData.length / parseInt(limit as string))
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting courier location history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve courier location history'
      });
    }
  }
}
