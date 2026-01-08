import { Request, Response } from 'express';
import { PricingEngine, PricingInput } from '../domain/engines/pricing.engine';

export class PricingController {
  private pricingEngine: PricingEngine;

  constructor() {
    this.pricingEngine = new PricingEngine();
  }

  async calculatePrice(req: Request, res: Response): Promise<void> {
    try {
      const input: PricingInput = req.body;
      const result = await this.pricingEngine.processPricingRequest(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PRICING_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async validatePrice(req: Request, res: Response): Promise<void> {
    try {
      const input: PricingInput = req.body;
      const result = await this.pricingEngine.processPricingRequest(input);
      
      res.status(200).json({
        success: true,
        data: {
          valid: result.success,
          finalPrice: result.finalPrice,
          confidence: result.confidence,
          warnings: result.warnings
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PRICE_VALIDATION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async generateQuote(req: Request, res: Response): Promise<void> {
    try {
      const input: PricingInput = {
        ...req.body,
        requestType: 'quote'
      };
      
      const result = await this.pricingEngine.processPricingRequest(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'QUOTE_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}