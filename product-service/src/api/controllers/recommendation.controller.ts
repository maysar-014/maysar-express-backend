import { Request, Response } from 'express';
import { RecommendationEngine, RecommendationInput } from '../domain/engines/recommendation.engine';

export class RecommendationController {
  private recommendationEngine: RecommendationEngine;

  constructor() {
    this.recommendationEngine = new RecommendationEngine();
  }

  async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const input: RecommendationInput = req.body;
      const result = await this.recommendationEngine.generateRecommendations(input);
      
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async getCustomerRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { requestType = 'homepage', maxRecommendations = 10 } = req.query;
      
      const input: RecommendationInput = {
        customerId,
        context: {
          channel: 'api',
          timestamp: new Date()
        },
        requestType: requestType as any,
        maxRecommendations: parseInt(maxRecommendations as string)
      };

      const result = await this.recommendationEngine.generateRecommendations(input);
      
      res.status(200).json({
        success: true,
        data: result.recommendations,
        metadata: result.recommendations_metadata,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CUSTOMER_RECOMMENDATION_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { recommendationId, feedback, action } = req.body;
      
      // Store feedback for model improvement
      // This would integrate with ML pipeline
      
      res.status(200).json({
        success: true,
        data: {
          feedbackId: `feedback_${Date.now()}`,
          processed: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FEEDBACK_ERROR',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}