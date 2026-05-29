import { FraudDetector } from '../fraud-detector';
import { SignalValues } from '../types';

const baseSignals: SignalValues = {
  priceCompetitiveness: 70,
  sellerTrustScore: 80,
  fulfillmentReliability: 75,
  deliverySpeed: 60,
  stockReliability: 65,
  disputeRate: 55,
  cancellationRate: 50,
  returnRate: 45,
  customerRetentionImpact: 40,
};

describe('FraudDetector', () => {
  const detector = new FraudDetector();

  it('flags outliers and substitutes rolling means', () => {
    const flags = detector.detectAnomalies(
      {
        signalValues: {
          ...baseSignals,
          priceCompetitiveness: 10,
        },
        currentOfferPrice: 40,
        currentStockLevel: 5,
      },
      {
        rollingMean: {
          priceCompetitiveness: 65,
        },
        rollingStdDev: {
          priceCompetitiveness: 5,
        },
        thirtyDayAveragePrice: 100,
        stockLevelYesterday: 50,
      },
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({
      signalName: 'priceCompetitiveness',
      detectedValue: 10,
      substitutedValue: 65,
    });

    const substituted = detector.applyAnomalySubstitutions(baseSignals, flags);
    expect(substituted.priceCompetitiveness).toBe(65);
    expect(baseSignals.priceCompetitiveness).toBe(70);
  });

  it('detects stock spikes and price drops without duplicating the same signal', () => {
    const flags = detector.detectAnomalies(
      {
        signalValues: baseSignals,
        currentOfferPrice: 40,
        currentStockLevel: 400,
      },
      {
        rollingMean: {
          stockReliability: 72,
          priceCompetitiveness: 66,
        },
        rollingStdDev: {
          stockReliability: 4,
          priceCompetitiveness: 3,
        },
        thirtyDayAveragePrice: 100,
        stockLevelYesterday: 50,
      },
    );

    expect(flags.map(flag => flag.signalName)).toEqual(
      expect.arrayContaining(['stockReliability', 'priceCompetitiveness'])
    );
    expect(detector.computeManipulationPenalty(2)).toBe(0);
    expect(detector.computeManipulationPenalty(3)).toBe(-20);
  });
});
