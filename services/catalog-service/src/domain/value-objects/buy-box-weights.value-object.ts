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

  static fromEnv(): BuyBoxWeights {
    const price = parseFloat(process.env.BUY_BOX_WEIGHT_PRICE || '0.5');
    const rating = parseFloat(process.env.BUY_BOX_WEIGHT_RATING || '0.3');
    const availability = parseFloat(process.env.BUY_BOX_WEIGHT_AVAILABILITY || '0.2');
    return new BuyBoxWeights(price, rating, availability);
  }

  static defaults(): BuyBoxWeights {
    return new BuyBoxWeights(0.5, 0.3, 0.2);
  }

  static get MATCH_CONFIDENCE_THRESHOLD(): number {
    return parseFloat(process.env.BUY_BOX_MATCH_CONFIDENCE_THRESHOLD || '0.75');
  }

  static get NEW_SELLER_BOOST(): number {
    return parseFloat(process.env.BUY_BOX_NEW_SELLER_BOOST || '5');
  }

  static get RECENCY_BOOST(): number {
    return parseFloat(process.env.BUY_BOX_RECENCY_BOOST || '5');
  }

  static get MAX_ALTERNATIVES(): number {
    return parseInt(process.env.BUY_BOX_MAX_ALTERNATIVES || '5', 10);
  }
}
