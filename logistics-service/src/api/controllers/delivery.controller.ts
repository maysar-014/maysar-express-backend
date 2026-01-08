import { Request, Response } from 'express';
import { LogisticsEngine, LogisticsInput } from '../../domain/engines/logistics.engine';
import { RouteOptimizationEngine, RouteOptimizationInput } from '../../domain/engines/route-optimization.engine';

export class DeliveryController {
  private logisticsEngine: LogisticsEngine;
  private routeEngine: RouteOptimizationEngine;

  constructor() {
    this.logisticsEngine = new LogisticsEngine();
    this.routeEngine = new RouteOptimizationEngine();
  }

  async scheduleDelivery(req: Request, res: Response): Promise<void> {
    try {
      const input: LogisticsInput = req.body;
      const result = await this.logisticsEngine.processLogistics(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERY_SCHEDULING_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async trackDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId } = req.params;
      
      // Simulate delivery tracking
      const trackingData = {
        deliveryId,
        status: 'in_transit',
        currentLocation: {
          lat: -6.7924,
          lng: 39.2083,
          address: 'Dar es Salaam, Tanzania'
        },
        estimatedArrival: new Date(Date.now() + 30 * 60000),
        courier: {
          name: 'Elite Courier',
          phone: '+255123456789',
          rating: 4.9
        },
        progress: 65
      };

      res.status(200).json({
        success: true,
        data: trackingData,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRACKING_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async updateDeliveryStatus(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const { status, location, notes } = req.body;
      
      // Update delivery status
      const updatedDelivery = {
        deliveryId,
        status,
        location,
        notes,
        updatedAt: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: updatedDelivery,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_UPDATE_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async optimizeRoute(req: Request, res: Response): Promise<void> {
    try {
      const input: RouteOptimizationInput = req.body;
      const result = await this.routeEngine.optimizeRoute(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ROUTE_OPTIMIZATION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}