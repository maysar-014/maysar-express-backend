import { FraudDetectionAlgorithm } from './fraud-detection.algorithm';

describe('FraudDetectionAlgorithm', () => {
  it('detects fraud when multiple risk signals exceed threshold', () => {
    const now = new Date('2026-03-09T12:00:00.000Z');
    const activity = {
      enablerId: 'en-1',
      buyerId: 'b-1',
      orderAmount: 6_000_000,
      timestamp: now,
      ipAddress: '10.0.0.1'
    };
    const history = [
      {
        enablerId: 'en-2',
        buyerId: 'b-ip',
        orderAmount: 1000,
        timestamp: new Date(now.getTime() - 10 * 60 * 1000),
        ipAddress: '10.0.0.1'
      },
      ...Array.from({ length: 11 }, (_, i) => ({
      enablerId: 'en-1',
      buyerId: `b-${i}`,
      orderAmount: 1000,
      timestamp: new Date(now.getTime() - 10 * 60 * 1000),
      ipAddress: i === 0 ? '10.0.0.1' : `10.0.0.${i + 1}`
    }))
    ];

    const result = FraudDetectionAlgorithm.detectFraud(activity, history as never);

    expect(result.isFraudulent).toBe(true);
    expect(result.riskScore).toBe(100);
    expect(result.reason).toContain('High order velocity');
    expect(result.reason).toContain('High value order');
    expect(result.reason).toContain('Suspicious IP activity');
  });

  it('returns low risk when no suspicious patterns are present', () => {
    const activity = {
      enablerId: 'en-2',
      buyerId: 'b-2',
      orderAmount: 10000,
      timestamp: new Date('2026-03-09T12:00:00.000Z'),
      ipAddress: '192.168.0.1'
    };
    const history = [
      {
        enablerId: 'en-2',
        buyerId: 'b-3',
        orderAmount: 20000,
        timestamp: new Date('2026-03-09T10:00:00.000Z'),
        ipAddress: '192.168.0.2'
      }
    ];

    const result = FraudDetectionAlgorithm.detectFraud(activity, history as never);

    expect(result).toEqual({
      isFraudulent: false,
      reason: undefined,
      riskScore: 0
    });
  });
});

