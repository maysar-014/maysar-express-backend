import { AnomalyFlagResult } from '../buy-box/types';

export interface BuyBoxAlternative {
  sellerId: string;
  score: number;
  rank: number;
}

export class BuyBoxResult {
  constructor(
    public readonly productId: string,
    public readonly primarySellerId: string,
    public readonly primaryScore: number,
    public readonly alternatives: BuyBoxAlternative[],
    public readonly computedAt: Date,
    public readonly anomalyFlags: AnomalyFlagResult[] = []
  ) {}

  static noEligibleSellers(productId: string): BuyBoxResult {
    return new BuyBoxResult(productId, '', 0, [], new Date(), []);
  }
}
