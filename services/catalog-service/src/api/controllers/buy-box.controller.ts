import { Request, Response } from 'express';
import { ComputeBuyBoxUseCase } from '../../application/use-cases/compute-buy-box.use-case';
import { IBuyBoxRepository } from '../../domain/repositories/repository.interfaces';

export class BuyBoxController {
  constructor(
    private readonly computeUseCase: ComputeBuyBoxUseCase,
    private readonly buyBoxRepository: IBuyBoxRepository
  ) {}

  async getBuyBox(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const result = await this.buyBoxRepository.findByProductId(productId);

      if (!result) {
        res.status(404).json({ error: 'Buy Box not computed for this product' });
        return;
      }

      res.status(200).json({
        productId: result.productId,
        primarySellerId: result.primarySellerId,
        primaryScore: result.primaryScore,
        alternatives: result.alternatives,
        lastComputedAt: result.computedAt
      });
    } catch (error: any) {
      console.error('Error fetching Buy Box:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async triggerCompute(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { listings } = req.body;

      if (!listings || !Array.isArray(listings)) {
        res.status(400).json({ error: 'listings array is required' });
        return;
      }

      const result = await this.computeUseCase.execute({ productId, listings });
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error computing Buy Box:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
