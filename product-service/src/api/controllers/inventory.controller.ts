import { Request, Response } from 'express';
import { InventoryEngine, InventoryInput } from '../domain/engines/inventory.engine';

export class InventoryController {
  private inventoryEngine: InventoryEngine;

  constructor() {
    this.inventoryEngine = new InventoryEngine();
  }

  async checkStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, variantId, quantity, warehouseId } = req.params;
      
      const input: InventoryInput = {
        productId,
        variantId,
        quantity: parseInt(quantity) || 1,
        warehouseId,
        reservationType: 'quote',
        priority: 'normal'
      };

      const result = await this.inventoryEngine.processInventoryRequest(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INVENTORY_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async reserveStock(req: Request, res: Response): Promise<void> {
    try {
      const input: InventoryInput = req.body;
      const result = await this.inventoryEngine.processInventoryRequest(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RESERVATION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { productIds } = req.body;
      const results = await Promise.all(
        productIds.map(async (productId: string) => {
          const input: InventoryInput = {
            productId,
            quantity: 1,
            warehouseId: 'default',
            reservationType: 'quote',
            priority: 'normal'
          };
          return await this.inventoryEngine.processInventoryRequest(input);
        })
      );

      res.status(200).json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AVAILABILITY_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}