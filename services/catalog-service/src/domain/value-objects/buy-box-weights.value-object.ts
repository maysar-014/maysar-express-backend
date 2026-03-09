export class BuyBoxWeights {
  constructor(
    public readonly price: number,
    public readonly rating: number,
    public readonly availability: number
  ) {
    if (Math.abs(price + rating + availability - 1.0) > 0.001) {
      throw new Error('Weights must sum to 1.0');
    }
  }

  static fromConfig(config?: Partial<{ price: number; rating: number; availability: number }>): BuyBoxWeights {
    const price = config?.price ?? 0.5;
    const rating = config?.rating ?? 0.3;
    const availability = config?.availability ?? 0.2;
    return new BuyBoxWeights(price, rating, availability);
  }

  static defaults(): BuyBoxWeights {
    return new BuyBoxWeights(0.5, 0.3, 0.2);
  }

  static readonly MATCH_CONFIDENCE_THRESHOLD = 0.75;
  static readonly NEW_SELLER_BOOST = 5;
  static readonly RECENCY_BOOST = 5;
  static readonly MAX_ALTERNATIVES = 5;
}
