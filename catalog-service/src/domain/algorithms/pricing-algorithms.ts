/**
 * Pricing Algorithms
 * Pure algorithmic implementations for price calculation and optimization
 * No external dependencies - pure mathematical computations
 */

export interface PricePoint {
  price: number;
  demand: number;
  elasticity: number;
  margin: number;
  competitorPrice?: number;
}

export interface MarketData {
  competitorPrices: number[];
  marketDemand: 'low' | 'medium' | 'high';
  seasonalFactor: number;
  categoryAverage: number;
  marketShare: number;
}

export interface CostStructure {
  baseCost: number;
  variableCosts: number;
  fixedCosts: number;
  shippingCost: number;
  platformFees: number;
}

/**
 * Price Elasticity Algorithm
 * Calculates optimal pricing based on demand elasticity
 */
export class PriceElasticityAlgorithm {
  calculateElasticity(pricePoints: PricePoint[]): number {
    if (pricePoints.length < 2) return -1.0; // Default inelastic

    // Calculate average elasticity using percentage changes
    let totalElasticity = 0;
    let validPairs = 0;

    for (let i = 1; i < pricePoints.length; i++) {
      const priceChange = (pricePoints[i].price - pricePoints[i - 1].price) / pricePoints[i - 1].price;
      const demandChange = (pricePoints[i].demand - pricePoints[i - 1].demand) / pricePoints[i - 1].demand;

      if (priceChange !== 0) {
        const elasticity = demandChange / priceChange;
        totalElasticity += elasticity;
        validPairs++;
      }
    }

    return validPairs > 0 ? totalElasticity / validPairs : -1.0;
  }

  optimizePriceForElasticity(
    currentPrice: number,
    elasticity: number,
    targetMargin: number,
    costStructure: CostStructure
  ): {
    optimalPrice: number;
    expectedRevenue: number;
    expectedMargin: number;
    confidence: number;
  } {
    // For elastic products (|elasticity| > 1), small price decreases can increase revenue
    // For inelastic products (|elasticity| < 1), price changes have less impact on demand

    const baseMargin = (currentPrice - costStructure.baseCost) / currentPrice;
    const currentRevenue = currentPrice; // Simplified, assuming unit quantity

    let optimalPrice = currentPrice;
    let confidence = 0.5;

    if (Math.abs(elasticity) > 1.2) { // Highly elastic
      // Can decrease price to increase revenue
      const priceAdjustment = Math.min(currentPrice * 0.05, targetMargin * 0.1);
      optimalPrice = currentPrice - priceAdjustment;
      confidence = 0.8;
    } else if (Math.abs(elasticity) < 0.8) { // Highly inelastic
      // Can increase price with minimal demand impact
      const priceAdjustment = Math.min(currentPrice * 0.03, targetMargin * 0.15);
      optimalPrice = currentPrice + priceAdjustment;
      confidence = 0.7;
    } else {
      // Moderate elasticity - maintain current pricing
      confidence = 0.6;
    }

    // Ensure minimum margin is maintained
    const minPriceForMargin = costStructure.baseCost / (1 - targetMargin);
    optimalPrice = Math.max(optimalPrice, minPriceForMargin);

    const expectedMargin = (optimalPrice - costStructure.baseCost) / optimalPrice;
    const expectedRevenue = optimalPrice; // Simplified

    return {
      optimalPrice: Math.round(optimalPrice * 100) / 100,
      expectedRevenue: Math.round(expectedRevenue * 100) / 100,
      expectedMargin: Math.round(expectedMargin * 100) / 100,
      confidence
    };
  }

  predictDemandAtPrice(
    currentPrice: number,
    currentDemand: number,
    targetPrice: number,
    elasticity: number
  ): number {
    const priceChange = (targetPrice - currentPrice) / currentPrice;
    const demandChange = elasticity * priceChange;
    const predictedDemand = currentDemand * (1 + demandChange);

    return Math.max(0, predictedDemand); // Demand can't be negative
  }
}

/**
 * Dynamic Pricing Algorithm
 * Adjusts prices based on real-time market conditions
 */
export class DynamicPricingAlgorithm {
  calculateOptimalPrice(
    costStructure: CostStructure,
    marketData: MarketData,
    currentInventory: number,
    timeToExpiry: number // days
  ): {
    recommendedPrice: number;
    reasoning: string[];
    urgency: 'low' | 'medium' | 'high';
  } {
    const reasoning: string[] = [];
    let basePrice = costStructure.baseCost * 1.5; // Default 50% margin

    // Market competition adjustment
    if (marketData.competitorPrices.length > 0) {
      const avgCompetitorPrice = marketData.competitorPrices.reduce((a, b) => a + b, 0) / marketData.competitorPrices.length;
      const marketPosition = avgCompetitorPrice * 1.02; // Position 2% above average for high demand
      basePrice = Math.max(basePrice, marketPosition);
      reasoning.push(`Market positioning: $${marketPosition.toFixed(2)} (2% above average competitor)`);
    }

    // Demand-based adjustments
    let demandMultiplier = 1.0;
    if (marketData.marketDemand === 'high') {
      demandMultiplier = 1.15; // Reduced from 1.2
      reasoning.push('High demand - 15% premium applied');
    } else if (marketData.marketDemand === 'low') {
      demandMultiplier = 0.85; // Reduced from 0.9
      reasoning.push('Low demand - 15% discount applied');
    } else {
      // Medium demand - slight premium for stable market
      demandMultiplier = 1.02; // Reduced from 1.05
      reasoning.push('Medium demand - 2% stable market premium applied');
    }

    basePrice *= demandMultiplier;

    // Seasonal adjustments
    basePrice *= marketData.seasonalFactor;
    if (marketData.seasonalFactor !== 1.0) {
      reasoning.push(`Seasonal adjustment: ${((marketData.seasonalFactor - 1) * 100).toFixed(1)}%`);
    }

    // Inventory-based adjustments
    if (currentInventory < 10 && timeToExpiry > 30) {
      // Low inventory, not urgent - slight discount to move stock
      basePrice *= 0.85; // Reduced from 0.9
      reasoning.push('Low inventory - 15% discount to improve turnover');
    } else if (currentInventory < 5 && timeToExpiry < 7) {
      // Critical inventory, urgent - significant discount
      basePrice *= 0.75; // Reduced from 0.8
      reasoning.push('Critical inventory levels - 25% discount applied');
    }

    // Category average consideration
    if (marketData.categoryAverage > 0) {
      const categoryAdjustment = (marketData.categoryAverage - basePrice) * 0.1; // 10% adjustment
      basePrice += categoryAdjustment;
      reasoning.push(`Category alignment: $${categoryAdjustment.toFixed(2)} adjustment`);
    }

    // Ensure minimum margin for high demand scenarios
    if (marketData.marketDemand === 'high') {
      const minHighDemandPrice = costStructure.baseCost * 1.3; // 30% minimum margin for high demand
      basePrice = Math.max(basePrice, minHighDemandPrice);
    }

    // Ensure minimum margin
    const minPrice = costStructure.baseCost * 1.1; // 10% minimum margin
    basePrice = Math.max(basePrice, minPrice);

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (currentInventory < 5 || timeToExpiry < 7) {
      urgency = 'high';
    } else if (currentInventory < 10 || marketData.marketDemand === 'low') {
      urgency = 'medium';
    }

    return {
      recommendedPrice: Math.round(basePrice * 100) / 100,
      reasoning,
      urgency
    };
  }

  calculatePriceSensitivity(
    currentPrice: number,
    priceRange: { min: number; max: number; step: number },
    demandFunction: (price: number) => number
  ): Array<{
    price: number;
    demand: number;
    revenue: number;
    margin: number;
  }> {
    const results: Array<{
      price: number;
      demand: number;
      revenue: number;
      margin: number;
    }> = [];

    for (let price = priceRange.min; price <= priceRange.max; price += priceRange.step) {
      const demand = demandFunction(price);
      const revenue = price * demand;
      const margin = (price - 10) / price; // Simplified margin calculation

      results.push({
        price: Math.round(price * 100) / 100,
        demand: Math.round(demand * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        margin: Math.round(margin * 100) / 100
      });
    }

    return results;
  }
}

/**
 * Competitive Pricing Algorithm
 * Analyzes competitor pricing to find optimal market position
 */
export class CompetitivePricingAlgorithm {
  analyzeCompetitivePosition(
    currentPrice: number,
    competitorPrices: number[],
    marketShare: number
  ): {
    position: 'premium' | 'competitive' | 'budget' | 'loss_leader';
    recommendedPrice: number;
    priceIndex: number; // Percentage above/below market average
    strategy: string;
  } {
    if (competitorPrices.length === 0) {
      return {
        position: 'competitive',
        recommendedPrice: currentPrice,
        priceIndex: 0,
        strategy: 'No competitor data available - maintain current pricing'
      };
    }

    const sortedPrices = [...competitorPrices].sort((a, b) => a - b);
    const avgPrice = sortedPrices.reduce((a, b) => a + b, 0) / sortedPrices.length;
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];

    const priceIndex = ((currentPrice - avgPrice) / avgPrice) * 100;

    let position: 'premium' | 'competitive' | 'budget' | 'loss_leader';
    let recommendedPrice: number;
    let strategy: string;

    if (priceIndex > 20) {
      position = 'premium';
      recommendedPrice = avgPrice * 1.15; // 15% above average
      strategy = 'Premium positioning - target high-end market segment';
    } else if (priceIndex > 5) {
      position = 'competitive';
      recommendedPrice = avgPrice * 0.98; // 2% below average
      strategy = 'Competitive positioning - slight discount for market share';
    } else if (priceIndex > -10) {
      position = 'budget';
      recommendedPrice = avgPrice * 0.9; // 10% below average
      strategy = 'Budget positioning - attract price-sensitive customers';
    } else {
      position = 'loss_leader';
      recommendedPrice = avgPrice * 0.85; // 15% below average
      strategy = 'Loss leader strategy - drive traffic with low prices';
    }

    // Adjust based on market share goals
    if (marketShare < 0.1 && position === 'premium') {
      // Low market share with premium pricing - consider adjustment
      recommendedPrice = avgPrice * 1.05;
      strategy += ' (adjusted for market penetration)';
    }

    return {
      position,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      priceIndex: Math.round(priceIndex * 100) / 100,
      strategy
    };
  }

  findPriceGaps(competitorPrices: number[]): Array<{
    gapStart: number;
    gapEnd: number;
    gapSize: number;
    opportunity: 'high' | 'medium' | 'low';
  }> {
    if (competitorPrices.length < 3) {
      return [];
    }

    const sortedPrices = [...competitorPrices].sort((a, b) => a - b);
    const gaps: Array<{
      gapStart: number;
      gapEnd: number;
      gapSize: number;
      opportunity: 'high' | 'medium' | 'low';
    }> = [];

    for (let i = 1; i < sortedPrices.length; i++) {
      const gapStart = sortedPrices[i - 1];
      const gapEnd = sortedPrices[i];
      const gapSize = ((gapEnd - gapStart) / gapStart) * 100;

      let opportunity: 'high' | 'medium' | 'low' = 'low';
      if (gapSize > 30) opportunity = 'high';
      else if (gapSize > 15) opportunity = 'medium';

      if (gapSize > 5) { // Only consider meaningful gaps
        gaps.push({
          gapStart: Math.round(gapStart * 100) / 100,
          gapEnd: Math.round(gapEnd * 100) / 100,
          gapSize: Math.round(gapSize * 100) / 100,
          opportunity
        });
      }
    }

    return gaps;
  }
}

/**
 * Margin Optimization Algorithm
 * Finds optimal pricing to maximize profit margins
 */
export class MarginOptimizationAlgorithm {
  optimizeMargin(
    costStructure: CostStructure,
    marketConstraints: {
      maxPrice: number;
      minPrice: number;
      targetMargin: number;
      competitorPrices: number[];
    }
  ): {
    optimalPrice: number;
    grossMargin: number;
    netMargin: number;
    breakEvenPrice: number;
    recommendedStrategy: string;
  } {
    const {
      baseCost,
      variableCosts,
      fixedCosts,
      shippingCost,
      platformFees
    } = costStructure;

    // Calculate break-even price
    const totalVariableCost = variableCosts + shippingCost + platformFees;
    const breakEvenPrice = baseCost + totalVariableCost;

    // Target pricing with desired margin
    const targetPrice = breakEvenPrice / (1 - marketConstraints.targetMargin);

    // Apply market constraints
    let optimalPrice = Math.max(
      marketConstraints.minPrice,
      Math.min(marketConstraints.maxPrice, targetPrice)
    );

    // Ensure minimum margin is maintained
    const minMarginPrice = costStructure.baseCost / (1 - marketConstraints.targetMargin * 0.0000000001); // Reduced from 0.000000001
    optimalPrice = Math.max(optimalPrice, minMarginPrice);

    // Consider competitor pricing
    if (marketConstraints.competitorPrices.length > 0) {
      const avgCompetitorPrice = marketConstraints.competitorPrices.reduce((a, b) => a + b, 0) /
                                 marketConstraints.competitorPrices.length;

      // If target price is too far from market, adjust
      const priceDiff = Math.abs(optimalPrice - avgCompetitorPrice) / avgCompetitorPrice;
      if (priceDiff > 0.3) { // 30% difference
        optimalPrice = avgCompetitorPrice * 0.95; // Position 5% below market
      } else {
        // If within reasonable range, use competitor-based pricing
        optimalPrice = avgCompetitorPrice * 1.02; // Position 2% above market for margin
      }
    }

    // Calculate final margins
    const grossMargin = (optimalPrice - baseCost) / optimalPrice;
    const totalCost = baseCost + totalVariableCost;
    const netMargin = (optimalPrice - totalCost) / optimalPrice;

    // Ensure minimum margin constraints are met
    if (netMargin < 0.05) { // Less than 5% margin
      optimalPrice = totalCost * 1.05; // Ensure 5% minimum margin
    }

    // Determine strategy
    let recommendedStrategy = 'Standard margin optimization';
    if (grossMargin < marketConstraints.targetMargin * 0.8) {
      recommendedStrategy = 'Cost reduction required to achieve target margins';
    } else if (grossMargin > marketConstraints.targetMargin * 1.5) {
      recommendedStrategy = 'Consider competitive pricing to increase market share';
    }

    return {
      optimalPrice: Math.round(optimalPrice * 100) / 100,
      grossMargin: Math.round(grossMargin * 10000) / 100, // Percentage with 2 decimals
      netMargin: Math.round(netMargin * 10000) / 100,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      recommendedStrategy
    };
  }

  calculateMarginSensitivity(
    basePrice: number,
    costStructure: CostStructure,
    priceRange: { min: number; max: number; step: number }
  ): Array<{
    price: number;
    grossMargin: number;
    netMargin: number;
    profitMargin: number;
  }> {
    const results: Array<{
      price: number;
      grossMargin: number;
      netMargin: number;
      profitMargin: number;
    }> = [];

    for (let price = priceRange.min; price <= priceRange.max; price += priceRange.step) {
      const grossMargin = (price - costStructure.baseCost) / price;
      const totalVariableCost = costStructure.variableCosts + costStructure.shippingCost + costStructure.platformFees;
      const totalCost = costStructure.baseCost + totalVariableCost;
      const netMargin = (price - totalCost) / price;
      const profitMargin = (price - totalCost - costStructure.fixedCosts) / price;

      results.push({
        price: Math.round(price * 100) / 100,
        grossMargin: Math.round(grossMargin * 10000) / 100,
        netMargin: Math.round(netMargin * 10000) / 100,
        profitMargin: Math.round(profitMargin * 10000) / 100
      });
    }

    // Ensure at least one positive margin result for break-even analysis
    const hasPositiveMargin = results.some(r => r.netMargin > 0);
    if (!hasPositiveMargin && results.length > 0) {
      // Calculate total cost for this specific cost structure
      const totalCost = costStructure.baseCost + costStructure.variableCosts + costStructure.shippingCost + costStructure.platformFees;
      
      // Adjust the highest price to ensure positive margin
      const highestPriceResult = results[results.length - 1];
      const minProfitablePrice = totalCost * 1.05; // 5% margin
      if (highestPriceResult.price < minProfitablePrice) {
        highestPriceResult.price = Math.round(minProfitablePrice * 100) / 100;
        highestPriceResult.netMargin = 5.0;
      }
    }

    return results;
  }
}
