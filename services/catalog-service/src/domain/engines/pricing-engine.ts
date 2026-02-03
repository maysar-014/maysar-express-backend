/**
 * Pricing Engine
 * Domain engine for price calculation and optimization
 * Pure business logic - no side effects or external dependencies
 */

import { Price, WholesalePricing, CostPrice, WholesaleTier } from '../value-objects/monetary.value-object';
import { ProductType } from '../value-objects/product-types.value-object';

export interface PricingContext {
  productType: ProductType;
  baseCost?: number;
  marketPrice?: number;
  competitorPrices?: number[];
  demandLevel: 'low' | 'medium' | 'high';
  seasonalityFactor: number;
  sellerReputation: number; // 1-5 rating
  productCondition: 'new' | 'used' | 'refurbished';
}

export interface PricingStrategy {
  calculateOptimalPrice(context: PricingContext): Price;
  calculateWholesalePricing(basePrice: Price, context: PricingContext): WholesalePricing;
  suggestDynamicAdjustment(currentPrice: Price, context: PricingContext): {
    suggestedPrice: Price;
    adjustmentReason: string;
    confidence: number;
  };
}

export class CompetitivePricingStrategy implements PricingStrategy {
  calculateOptimalPrice(context: PricingContext): Price {
    if (!context.marketPrice) {
      throw new Error('Market price required for competitive pricing');
    }

    let adjustmentFactor = 1.0;

    // Demand adjustments
    if (context.demandLevel === 'high') {
      adjustmentFactor *= 1.15; // 15% premium for high demand
    } else if (context.demandLevel === 'low') {
      adjustmentFactor *= 0.90; // 10% discount for low demand
    }

    // Seller reputation adjustment
    const reputationMultiplier = 0.9 + (context.sellerReputation * 0.04); // 90-110% based on rating
    adjustmentFactor *= reputationMultiplier;

    // Seasonality adjustment
    adjustmentFactor *= context.seasonalityFactor;

    // Product condition adjustment
    if (context.productCondition === 'used') {
      adjustmentFactor *= 0.85;
    } else if (context.productCondition === 'refurbished') {
      adjustmentFactor *= 0.95;
    }

    const optimalAmount = context.marketPrice * adjustmentFactor;
    return new Price(Math.round(optimalAmount * 100) / 100); // Round to 2 decimal places
  }

  calculateWholesalePricing(basePrice: Price, context: PricingContext): WholesalePricing {
    const unitPrice = new Price(basePrice.toNumber() * 0.85); // 15% wholesale discount

    // Dynamic tier calculation based on demand and product type
    const tiers: WholesaleTier[] = [];

    if (context.demandLevel === 'high') {
      tiers.push(
        new WholesaleTier(100, 5),  // 100+ units: 5% additional discount
        new WholesaleTier(500, 8),  // 500+ units: 8% additional discount
        new WholesaleTier(1000, 12) // 1000+ units: 12% additional discount
      );
    } else {
      tiers.push(
        new WholesaleTier(250, 3),
        new WholesaleTier(1000, 6),
        new WholesaleTier(2500, 10)
      );
    }

    return new WholesalePricing(unitPrice, tiers);
  }

  suggestDynamicAdjustment(currentPrice: Price, context: PricingContext): {
    suggestedPrice: Price;
    adjustmentReason: string;
    confidence: number;
  } {
    const optimalPrice = this.calculateOptimalPrice(context);
    const currentAmount = currentPrice.toNumber();
    const optimalAmount = optimalPrice.toNumber();

    const difference = Math.abs(optimalAmount - currentAmount);
    const percentageDiff = (difference / currentAmount) * 100;

    let adjustmentReason: string;
    let confidence: number;

    if (percentageDiff < 2) {
      adjustmentReason = 'Price is optimal for current market conditions';
      confidence = 0.95;
    } else if (optimalAmount > currentAmount) {
      adjustmentReason = `Price increase recommended due to ${context.demandLevel} demand and market conditions`;
      confidence = Math.min(0.9, percentageDiff / 20); // Higher confidence for larger gaps
    } else {
      adjustmentReason = `Price reduction suggested to improve competitiveness`;
      confidence = Math.min(0.85, percentageDiff / 15);
    }

    return {
      suggestedPrice: optimalPrice,
      adjustmentReason,
      confidence
    };
  }
}

export class CostPlusPricingStrategy implements PricingStrategy {
  constructor(private readonly markupPercentage: number = 50) {}

  calculateOptimalPrice(context: PricingContext): Price {
    if (!context.baseCost) {
      throw new Error('Base cost required for cost-plus pricing');
    }

    const markupMultiplier = 1 + (this.markupPercentage / 100);
    let finalPrice = context.baseCost * markupMultiplier;

    // Apply market constraints if available
    if (context.marketPrice && context.competitorPrices) {
      const avgCompetitorPrice = context.competitorPrices.reduce((a, b) => a + b, 0) / context.competitorPrices.length;

      // Don't exceed market price by more than 20%
      const maxPrice = avgCompetitorPrice * 1.2;
      finalPrice = Math.min(finalPrice, maxPrice);

      // Don't go below 80% of lowest competitor
      const minPrice = Math.min(...context.competitorPrices) * 0.8;
      finalPrice = Math.max(finalPrice, minPrice);
    }

    return new Price(Math.round(finalPrice * 100) / 100);
  }

  calculateWholesalePricing(basePrice: Price, context: PricingContext): WholesalePricing {
    // Wholesale pricing with lower markup for bulk sales
    const wholesaleMarkup = this.markupPercentage * 0.6; // 60% of retail markup
    const unitPrice = new Price(context.baseCost! * (1 + wholesaleMarkup / 100));

    const tiers = [
      new WholesaleTier(50, 2),
      new WholesaleTier(200, 5),
      new WholesaleTier(500, 8)
    ];

    return new WholesalePricing(unitPrice, tiers);
  }

  suggestDynamicAdjustment(currentPrice: Price, context: PricingContext): {
    suggestedPrice: Price;
    adjustmentReason: string;
    confidence: number;
  } {
    const optimalPrice = this.calculateOptimalPrice(context);
    const currentAmount = currentPrice.toNumber();

    const margin = ((currentAmount - (context.baseCost || 0)) / (context.baseCost || 1)) * 100;

    if (margin < this.markupPercentage * 0.8) {
      return {
        suggestedPrice: optimalPrice,
        adjustmentReason: `Current margin (${margin.toFixed(1)}%) below target (${this.markupPercentage}%)`,
        confidence: 0.9
      };
    } else if (margin > this.markupPercentage * 1.5) {
      return {
        suggestedPrice: optimalPrice,
        adjustmentReason: `Margin too high (${margin.toFixed(1)}%), consider competitive adjustment`,
        confidence: 0.7
      };
    }

    return {
      suggestedPrice: currentPrice,
      adjustmentReason: 'Current pricing maintains healthy margins',
      confidence: 0.95
    };
  }
}

export class PricingEngine {
  constructor(
    private readonly primaryStrategy: PricingStrategy = new CompetitivePricingStrategy(),
    private readonly fallbackStrategy: PricingStrategy = new CostPlusPricingStrategy()
  ) {}

  calculateProductPrice(context: PricingContext): Price {
    try {
      return this.primaryStrategy.calculateOptimalPrice(context);
    } catch (error) {
      // Fallback to cost-plus if primary strategy fails
      if (context.baseCost) {
        return this.fallbackStrategy.calculateOptimalPrice(context);
      }
      throw error;
    }
  }

  calculateWholesalePricing(basePrice: Price, context: PricingContext): WholesalePricing {
    return this.primaryStrategy.calculateWholesalePricing(basePrice, context);
  }

  analyzePricingStrategy(context: PricingContext): {
    recommendedStrategy: 'competitive' | 'cost_plus' | 'dynamic';
    optimalPrice: Price;
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];

    // Strategy selection logic
    if (context.marketPrice && context.competitorPrices && context.competitorPrices.length >= 3) {
      reasoning.push('Strong competitive data available - competitive strategy recommended');
      const competitivePrice = this.primaryStrategy.calculateOptimalPrice(context);
      return {
        recommendedStrategy: 'competitive',
        optimalPrice: competitivePrice,
        confidence: 0.85,
        reasoning
      };
    } else if (context.baseCost) {
      reasoning.push('Limited market data but cost information available - cost-plus strategy');
      const costPlusPrice = this.fallbackStrategy.calculateOptimalPrice(context);
      return {
        recommendedStrategy: 'cost_plus',
        optimalPrice: costPlusPrice,
        confidence: 0.75,
        reasoning
      };
    } else {
      reasoning.push('Insufficient data for static strategies - dynamic pricing recommended');
      return {
        recommendedStrategy: 'dynamic',
        optimalPrice: new Price(0), // Placeholder
        confidence: 0.6,
        reasoning
      };
    }
  }

  validatePricingConstraints(price: Price, context: PricingContext): {
    isValid: boolean;
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Minimum price validation
    if (context.baseCost && price.toNumber() < context.baseCost * 0.5) {
      violations.push('Price too low - below 50% of cost');
      suggestions.push('Consider increasing price to maintain healthy margins');
    }

    // Maximum price validation
    if (context.marketPrice && price.toNumber() > context.marketPrice * 1.5) {
      violations.push('Price significantly above market average');
      suggestions.push('High price may reduce sales velocity');
    }

    // Competitor analysis
    if (context.competitorPrices) {
      const avgCompetitor = context.competitorPrices.reduce((a, b) => a + b, 0) / context.competitorPrices.length;
      const priceDiff = ((price.toNumber() - avgCompetitor) / avgCompetitor) * 100;

      if (priceDiff > 25) {
        suggestions.push(`Price ${(priceDiff > 0 ? 'above' : 'below')} market average by ${Math.abs(priceDiff).toFixed(1)}%`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      suggestions
    };
  }
}
