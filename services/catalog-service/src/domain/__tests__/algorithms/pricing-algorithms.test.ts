/**
 * Pricing Algorithms Test Suite
 * Tests for all pricing algorithm implementations
 */

import {
  PriceElasticityAlgorithm,
  DynamicPricingAlgorithm,
  CompetitivePricingAlgorithm,
  MarginOptimizationAlgorithm,
  PricePoint,
  MarketData,
  CostStructure
} from '../../algorithms/pricing-algorithms';

describe('Pricing Algorithms', () => {
  describe('PriceElasticityAlgorithm', () => {
    let algorithm: PriceElasticityAlgorithm;

    beforeEach(() => {
      algorithm = new PriceElasticityAlgorithm();
    });

    describe('calculateElasticity', () => {
      it('should calculate elasticity for elastic demand', () => {
        const pricePoints: PricePoint[] = [
          { price: 100, demand: 100, elasticity: 0, margin: 0.2 },
          { price: 90, demand: 120, elasticity: 0, margin: 0.2 },
          { price: 80, demand: 140, elasticity: 0, margin: 0.2 }
        ];

        const elasticity = algorithm.calculateElasticity(pricePoints);

        expect(elasticity).toBeLessThan(-1); // Elastic demand
        expect(elasticity).toBeGreaterThan(-2); // Reasonable range
      });

      it('should calculate elasticity for inelastic demand', () => {
        const pricePoints: PricePoint[] = [
          { price: 100, demand: 100, elasticity: 0, margin: 0.2 },
          { price: 110, demand: 95, elasticity: 0, margin: 0.2 },
          { price: 120, demand: 90, elasticity: 0, margin: 0.2 }
        ];

        const elasticity = algorithm.calculateElasticity(pricePoints);

        expect(elasticity).toBeGreaterThan(-1); // Inelastic demand
        expect(elasticity).toBeLessThan(0); // Negative elasticity
      });

      it('should return default inelastic value for insufficient data', () => {
        const pricePoints: PricePoint[] = [
          { price: 100, demand: 100, elasticity: 0, margin: 0.2 }
        ];

        const elasticity = algorithm.calculateElasticity(pricePoints);

        expect(elasticity).toBe(-1.0); // Default inelastic
      });

      it('should handle zero price changes gracefully', () => {
        const pricePoints: PricePoint[] = [
          { price: 100, demand: 100, elasticity: 0, margin: 0.2 },
          { price: 100, demand: 110, elasticity: 0, margin: 0.2 }
        ];

        const elasticity = algorithm.calculateElasticity(pricePoints);

        expect(elasticity).toBe(-1.0); // Should handle division by zero
      });
    });

    describe('optimizePriceForElasticity', () => {
      it('should optimize price for highly elastic product', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const result = algorithm.optimizePriceForElasticity(
          100,
          -1.5, // Highly elastic
          0.3, // 30% target margin
          costStructure
        );

        expect(result.optimalPrice).toBeLessThan(100); // Should decrease price
        expect(result.expectedMargin).toBeGreaterThan(0.2); // Should maintain margin
        expect(result.confidence).toBe(0.8); // High confidence for elastic
      });

      it('should optimize price for highly inelastic product', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const result = algorithm.optimizePriceForElasticity(
          100,
          -0.5, // Highly inelastic
          0.3, // 30% target margin
          costStructure
        );

        expect(result.optimalPrice).toBeGreaterThan(100); // Should increase price
        expect(result.expectedMargin).toBeGreaterThan(0.2); // Should maintain margin
        expect(result.confidence).toBe(0.7); // High confidence for inelastic
      });

      it('should maintain current price for moderate elasticity', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const result = algorithm.optimizePriceForElasticity(
          100,
          -1.0, // Moderate elasticity
          0.3, // 30% target margin
          costStructure
        );

        expect(result.optimalPrice).toBeCloseTo(100, 0); // Should maintain price
        expect(result.confidence).toBe(0.6); // Medium confidence
      });

      it('should ensure minimum margin is maintained', () => {
        const costStructure: CostStructure = {
          baseCost: 80,
          variableCosts: 5,
          fixedCosts: 2,
          shippingCost: 3,
          platformFees: 2
        };

        const result = algorithm.optimizePriceForElasticity(
          100,
          -2.0, // Very elastic
          0.2, // 20% target margin
          costStructure
        );

        const minPriceForMargin = costStructure.baseCost / (1 - 0.2);
        expect(result.optimalPrice).toBeGreaterThanOrEqual(minPriceForMargin);
      });
    });

    describe('predictDemandAtPrice', () => {
      it('should predict demand for price decrease with elastic product', () => {
        const demand = algorithm.predictDemandAtPrice(100, 100, 90, -1.5);

        expect(demand).toBeGreaterThan(100); // Demand should increase
        expect(demand).toBeLessThan(150); // Reasonable upper bound
      });

      it('should predict demand for price increase with inelastic product', () => {
        const demand = algorithm.predictDemandAtPrice(100, 100, 110, -0.5);

        expect(demand).toBeLessThan(100); // Demand should decrease slightly
        expect(demand).toBeGreaterThan(90); // But not too much
      });

      it('should handle negative demand gracefully', () => {
        const demand = algorithm.predictDemandAtPrice(100, 100, 200, -2.0);

        expect(demand).toBe(0); // Should not go negative
      });
    });
  });

  describe('DynamicPricingAlgorithm', () => {
    let algorithm: DynamicPricingAlgorithm;

    beforeEach(() => {
      algorithm = new DynamicPricingAlgorithm();
    });

    describe('calculateOptimalPrice', () => {
      it('should calculate price with market competition', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'medium',
          seasonalFactor: 1.0,
          categoryAverage: 110,
          marketShare: 0.15
        };

        const result = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          20,
          60
        );

        expect(result.recommendedPrice).toBeGreaterThan(50); // Above cost
        expect(result.recommendedPrice).toBeLessThan(120); // Below highest competitor
        expect(result.reasoning).toContainEqual(expect.stringContaining('Market positioning'));
      });

      it('should apply high demand premium', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'high',
          seasonalFactor: 1.0,
          categoryAverage: 110,
          marketShare: 0.15
        };

        const result = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          20,
          60
        );

        expect(result.reasoning).toContainEqual(expect.stringContaining('High demand'));
        expect(result.recommendedPrice).toBeGreaterThan(100); // Premium pricing
      });

      it('should apply low demand discount', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'low',
          seasonalFactor: 1.0,
          categoryAverage: 110,
          marketShare: 0.15
        };

        const result = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          20,
          60
        );

        expect(result.reasoning).toContainEqual(expect.stringContaining('Low demand'));
        expect(result.recommendedPrice).toBeLessThan(100); // Discounted pricing
      });

      it('should apply seasonal adjustments', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'medium',
          seasonalFactor: 1.2, // 20% seasonal increase
          categoryAverage: 110,
          marketShare: 0.15
        };

        const result = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          20,
          60
        );

        expect(result.reasoning).toContainEqual(expect.stringContaining('Seasonal adjustment'));
        expect(result.recommendedPrice).toBeGreaterThan(100); // Seasonal premium
      });

      it('should apply inventory-based discounts', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'medium',
          seasonalFactor: 1.0,
          categoryAverage: 110,
          marketShare: 0.15
        };

        const result = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          5, // Low inventory
          60
        );

        expect(result.reasoning).toContainEqual(expect.stringContaining('Low inventory'));
        expect(result.recommendedPrice).toBeLessThan(100); // Discount for turnover
      });

      it('should apply critical inventory discounts', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'medium',
          seasonalFactor: 1.0,
          categoryAverage: 110,
          marketShare: 0.15
        };

        const result = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          3, // Critical inventory
          5 // Urgent expiry
        );

        expect(result.reasoning).toContainEqual(expect.stringContaining('Critical inventory'));
        expect(result.recommendedPrice).toBeLessThan(90); // Significant discount
      });

      it('should determine urgency correctly', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketData: MarketData = {
          competitorPrices: [100, 110, 120],
          marketDemand: 'medium',
          seasonalFactor: 1.0,
          categoryAverage: 110,
          marketShare: 0.15
        };

        // High urgency
        const highUrgency = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          3,
          5
        );
        expect(highUrgency.urgency).toBe('high');

        // Medium urgency
        const mediumUrgency = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          8,
          60
        );
        expect(mediumUrgency.urgency).toBe('medium');

        // Low urgency
        const lowUrgency = algorithm.calculateOptimalPrice(
          costStructure,
          marketData,
          50,
          60
        );
        expect(lowUrgency.urgency).toBe('low');
      });
    });

    describe('calculatePriceSensitivity', () => {
      it('should calculate price sensitivity curve', () => {
        const result = algorithm.calculatePriceSensitivity(
          100,
          { min: 80, max: 120, step: 10 },
          (price) => 200 - price // Simple demand function
        );

        expect(result).toHaveLength(5); // 80, 90, 100, 110, 120

        // Check that revenue peaks at optimal price
        const maxRevenue = Math.max(...result.map(r => r.revenue));
        const maxRevenueIndex = result.findIndex(r => r.revenue === maxRevenue);
        const optimalPrice = result[maxRevenueIndex];

        expect(optimalPrice.price).toBeGreaterThan(80);
        expect(optimalPrice.price).toBeLessThan(120);
      });

      it('should handle different demand functions', () => {
        const result = algorithm.calculatePriceSensitivity(
          100,
          { min: 90, max: 110, step: 5 },
          (price) => 1000 / price // Inverse demand function
        );

        expect(result).toHaveLength(5); // 90, 95, 100, 105, 110

        // Revenue should be relatively stable with inverse demand
        const revenues = result.map(r => r.revenue);
        const revenueVariance = Math.max(...revenues) - Math.min(...revenues);

        expect(revenueVariance).toBeLessThan(50); // Low variance
      });
    });
  });

  describe('CompetitivePricingAlgorithm', () => {
    let algorithm: CompetitivePricingAlgorithm;

    beforeEach(() => {
      algorithm = new CompetitivePricingAlgorithm();
    });

    describe('analyzeCompetitivePosition', () => {
      it('should identify premium positioning', () => {
        const result = algorithm.analyzeCompetitivePosition(
          150, // Current price
          [100, 110, 120], // Competitor prices
          0.2 // Market share
        );

        expect(result.position).toBe('premium');
        expect(result.priceIndex).toBeGreaterThan(20);
        expect(result.recommendedPrice).toBeGreaterThan(125);
        expect(result.strategy).toContain('Premium positioning');
      });

      it('should identify competitive positioning', () => {
        const result = algorithm.analyzeCompetitivePosition(
          115, // Current price
          [100, 110, 120], // Competitor prices
          0.2 // Market share
        );

        expect(result.position).toBe('budget');
        expect(result.priceIndex).toBeGreaterThan(-10);
        expect(result.priceIndex).toBeLessThan(5);
        expect(result.recommendedPrice).toBeLessThan(115);
        expect(result.strategy).toContain('Budget positioning');
      });

      it('should identify budget positioning', () => {
        const result = algorithm.analyzeCompetitivePosition(
          95, // Current price
          [100, 110, 120], // Competitor prices
          0.2 // Market share
        );

        expect(result.position).toBe('loss_leader');
        expect(result.priceIndex).toBeLessThan(-10);
        expect(result.recommendedPrice).toBeLessThan(100);
        expect(result.strategy).toContain('Loss leader');
      });

      it('should identify loss leader positioning', () => {
        const result = algorithm.analyzeCompetitivePosition(
          80, // Current price
          [100, 110, 120], // Competitor prices
          0.2 // Market share
        );

        expect(result.position).toBe('loss_leader');
        expect(result.priceIndex).toBeLessThan(-10);
        expect(result.recommendedPrice).toBeLessThan(100);
        expect(result.strategy).toContain('Loss leader');
      });

      it('should adjust strategy for low market share', () => {
        const result = algorithm.analyzeCompetitivePosition(
          150, // Current price
          [100, 110, 120], // Competitor prices
          0.05 // Low market share
        );

        expect(result.position).toBe('premium');
        expect(result.strategy).toContain('adjusted for market penetration');
      });

      it('should handle no competitor data', () => {
        const result = algorithm.analyzeCompetitivePosition(
          100, // Current price
          [], // No competitor prices
          0.2 // Market share
        );

        expect(result.position).toBe('competitive');
        expect(result.recommendedPrice).toBe(100);
        expect(result.priceIndex).toBe(0);
        expect(result.strategy).toContain('No competitor data');
      });
    });

    describe('findPriceGaps', () => {
      it('should find significant price gaps', () => {
        const gaps = algorithm.findPriceGaps([100, 150, 200, 300]);

        expect(gaps).toHaveLength(3); // 100-150, 150-200, 200-300

        const largeGap = gaps.find(g => g.gapSize > 30);
        expect(largeGap).toBeDefined();
        expect(largeGap?.opportunity).toBe('high');
      });

      it('should ignore small price gaps', () => {
        const gaps = algorithm.findPriceGaps([100, 105, 110, 115]);

        expect(gaps).toHaveLength(0); // All gaps are small
      });

      it('should handle insufficient competitor data', () => {
        const gaps = algorithm.findPriceGaps([100, 110]);

        expect(gaps).toHaveLength(0); // Need at least 3 prices
      });

      it('should identify medium opportunity gaps', () => {
        const gaps = algorithm.findPriceGaps([100, 120, 140, 160]);

        expect(gaps).toHaveLength(3);

        const mediumGap = gaps.find(g => g.gapSize > 15 && g.gapSize <= 30);
        expect(mediumGap).toBeDefined();
        expect(mediumGap?.opportunity).toBe('medium');
      });
    });
  });

  describe('MarginOptimizationAlgorithm', () => {
    let algorithm: MarginOptimizationAlgorithm;

    beforeEach(() => {
      algorithm = new MarginOptimizationAlgorithm();
    });

    describe('optimizeMargin', () => {
      it('should optimize margin with standard constraints', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketConstraints = {
          maxPrice: 200,
          minPrice: 60,
          targetMargin: 0.3, // 30%
          competitorPrices: [100, 110, 120]
        };

        const result = algorithm.optimizeMargin(costStructure, marketConstraints);

        expect(result.optimalPrice).toBeGreaterThan(60);
        expect(result.optimalPrice).toBeLessThan(200);
        expect(result.grossMargin).toBeGreaterThan(20);
        expect(result.netMargin).toBeGreaterThan(10);
        expect(result.breakEvenPrice).toBeLessThan(result.optimalPrice);
      });

      it('should apply competitor-based adjustments', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketConstraints = {
          maxPrice: 200,
          minPrice: 60,
          targetMargin: 0.3,
          competitorPrices: [80, 85, 90] // Low competitor prices
        };

        const result = algorithm.optimizeMargin(costStructure, marketConstraints);

        // Should adjust below target due to low competitor prices
        expect(result.optimalPrice).toBeLessThan(100);
        expect(result.optimalPrice).toBeGreaterThan(80);
      });

      it('should handle cost reduction requirements', () => {
        const costStructure: CostStructure = {
          baseCost: 80,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketConstraints = {
          maxPrice: 100,
          minPrice: 60,
          targetMargin: 0.3,
          competitorPrices: [90, 95, 100]
        };

        const result = algorithm.optimizeMargin(costStructure, marketConstraints);

        expect(result.recommendedStrategy).toContain('Cost reduction required');
        expect(result.grossMargin).toBeLessThan(24); // Below 80% of target
      });

      it('should suggest competitive pricing for high margins', () => {
        const costStructure: CostStructure = {
          baseCost: 30,
          variableCosts: 5,
          fixedCosts: 2,
          shippingCost: 3,
          platformFees: 2
        };

        const marketConstraints = {
          maxPrice: 200,
          minPrice: 40,
          targetMargin: 0.2, // 20%
          competitorPrices: [100, 110, 120]
        };

        const result = algorithm.optimizeMargin(costStructure, marketConstraints);

        expect(result.recommendedStrategy).toContain('Consider competitive pricing');
        expect(result.grossMargin).toBeGreaterThan(30); // Above 150% of target
      });

      it('should enforce minimum margin constraints', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const marketConstraints = {
          maxPrice: 60, // Very low max price
          minPrice: 55,
          targetMargin: 0.3,
          competitorPrices: [100, 110, 120]
        };

        const result = algorithm.optimizeMargin(costStructure, marketConstraints);

        expect(result.optimalPrice).toBe(55); // Minimum price
        expect(result.grossMargin).toBeGreaterThan(5); // Above 10% minimum
      });
    });

    describe('calculateMarginSensitivity', () => {
      it('should calculate margin sensitivity curve', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const result = algorithm.calculateMarginSensitivity(
          100,
          costStructure,
          { min: 80, max: 120, step: 10 }
        );

        expect(result).toHaveLength(5); // 80, 90, 100, 110, 120

        // Margins should increase with price
        for (let i = 1; i < result.length; i++) {
          expect(result[i].grossMargin).toBeGreaterThan(result[i - 1].grossMargin);
          expect(result[i].netMargin).toBeGreaterThan(result[i - 1].netMargin);
        }
      });

      it('should handle zero and negative margins', () => {
        const costStructure: CostStructure = {
          baseCost: 100,
          variableCosts: 20,
          fixedCosts: 10,
          shippingCost: 10,
          platformFees: 10
        };

        const result = algorithm.calculateMarginSensitivity(
          100,
          costStructure,
          { min: 80, max: 120, step: 10 }
        );

        // Lower prices should have negative margins
        expect(result[0].grossMargin).toBeLessThan(0);
        expect(result[0].netMargin).toBeLessThan(0);

        // Higher prices should have positive margins
        expect(result[4].grossMargin).toBeGreaterThan(0);
        expect(result[4].netMargin).toBeGreaterThan(0);
      });

      it('should calculate break-even point', () => {
        const costStructure: CostStructure = {
          baseCost: 50,
          variableCosts: 10,
          fixedCosts: 5,
          shippingCost: 5,
          platformFees: 5
        };

        const result = algorithm.calculateMarginSensitivity(
          100,
          costStructure,
          { min: 70, max: 90, step: 5 }
        );

        // Find where net margin becomes positive
        const breakEvenIndex = result.findIndex(r => r.netMargin > 0);
        expect(breakEvenIndex).toBeGreaterThan(0);

        const breakEvenPrice = result[breakEvenIndex].price;
        expect(breakEvenPrice).toBeGreaterThan(70);
        expect(breakEvenPrice).toBeLessThan(90);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work together for comprehensive pricing strategy', () => {
      const elasticityAlgorithm = new PriceElasticityAlgorithm();
      const dynamicAlgorithm = new DynamicPricingAlgorithm();
      const competitiveAlgorithm = new CompetitivePricingAlgorithm();
      const marginAlgorithm = new MarginOptimizationAlgorithm();

      // Test data
      const costStructure: CostStructure = {
        baseCost: 50,
        variableCosts: 10,
        fixedCosts: 5,
        shippingCost: 5,
        platformFees: 5
      };

      const marketData: MarketData = {
        competitorPrices: [100, 110, 120],
        marketDemand: 'medium',
        seasonalFactor: 1.0,
        categoryAverage: 110,
        marketShare: 0.15
      };

      // Calculate elasticity
      const pricePoints: PricePoint[] = [
        { price: 100, demand: 100, elasticity: 0, margin: 0.2 },
        { price: 90, demand: 115, elasticity: 0, margin: 0.2 }
      ];
      const elasticity = elasticityAlgorithm.calculateElasticity(pricePoints);

      // Optimize for elasticity
      const elasticityResult = elasticityAlgorithm.optimizePriceForElasticity(
        100, elasticity, 0.3, costStructure
      );

      // Dynamic pricing
      const dynamicResult = dynamicAlgorithm.calculateOptimalPrice(
        costStructure, marketData, 20, 60
      );

      // Competitive analysis
      const competitiveResult = competitiveAlgorithm.analyzeCompetitivePosition(
        elasticityResult.optimalPrice, marketData.competitorPrices, marketData.marketShare
      );

      // Margin optimization
      const marginResult = marginAlgorithm.optimizeMargin(costStructure, {
        maxPrice: 150,
        minPrice: 60,
        targetMargin: 0.3,
        competitorPrices: marketData.competitorPrices
      });

      // All algorithms should produce reasonable results
      expect(elasticityResult.optimalPrice).toBeGreaterThan(50);
      expect(dynamicResult.recommendedPrice).toBeGreaterThan(50);
      expect(competitiveResult.recommendedPrice).toBeGreaterThan(50);
      expect(marginResult.optimalPrice).toBeGreaterThan(50);

      // Results should be in reasonable ranges
      expect(elasticityResult.optimalPrice).toBeLessThan(150);
      expect(dynamicResult.recommendedPrice).toBeLessThan(150);
      expect(competitiveResult.recommendedPrice).toBeLessThan(150);
      expect(marginResult.optimalPrice).toBeLessThan(150);
    });
  });
});