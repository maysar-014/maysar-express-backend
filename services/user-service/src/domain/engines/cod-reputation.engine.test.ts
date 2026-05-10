import { CODAction, CODReputationEngine } from './cod-reputation.engine';

describe('CODReputationEngine', () => {
  const engine = new CODReputationEngine();

  it('applies first successful delivery bonus and normal success bonus', () => {
    const firstSuccess = engine.calculateNewScore(40, CODAction.DELIVERY_CONFIRMED, true);
    const normalSuccess = engine.calculateNewScore(40, CODAction.DELIVERY_CONFIRMED, false);

    expect(firstSuccess.newScore).toBe(65);
    expect(firstSuccess.change).toBe(25);
    expect(firstSuccess.reason).toContain('unlock bonus');

    expect(normalSuccess.newScore).toBe(45);
    expect(normalSuccess.change).toBe(5);
  });

  it('applies suspension when score drops below threshold but above ban threshold', () => {
    const result = engine.calculateNewScore(35, CODAction.DELIVERY_REFUSED);

    expect(result.newScore).toBe(25);
    expect(result.permanentlyDisabled).toBe(false);
    expect(result.suspendedUntil).toBeInstanceOf(Date);
    expect(result.reason).toContain('suspended for 30 days');
  });

  it('applies permanent disable when score drops below ban threshold', () => {
    const result = engine.calculateNewScore(8, CODAction.FRAUD_DETECTED);

    expect(result.newScore).toBe(0);
    expect(result.permanentlyDisabled).toBe(true);
    expect(result.reason).toContain('permanently disabled');
  });

  it('keeps score inside min/max bounds', () => {
    const cappedHigh = engine.calculateNewScore(99, CODAction.DELIVERY_CONFIRMED, true);
    const cappedLow = engine.calculateNewScore(1, CODAction.PENALTY_APPLIED);

    expect(cappedHigh.newScore).toBe(100);
    expect(cappedLow.newScore).toBe(0);
  });

  it('evaluates eligibility from permanent disable, suspension, low score, order history, and healthy score', () => {
    const suspendedUntil = new Date(Date.now() + 60_000);

    expect(engine.isEligible(80, 10, undefined, true)).toEqual({
      eligible: false,
      reason: 'COD is permanently disabled for this account'
    });

    const suspended = engine.isEligible(80, 10, suspendedUntil, false);
    expect(suspended.eligible).toBe(false);
    expect(suspended.reason).toContain('suspended until');

    expect(engine.isEligible(25, 10, undefined, false)).toEqual({
      eligible: false,
      reason: 'COD reputation score (25) is below required minimum of 50'
    });

    expect(engine.isEligible(80, 2, undefined, false)).toEqual({
      eligible: false,
      reason: 'Buyer must have at least 3 successful orders to unlock COD privilege'
    });

    expect(engine.isEligible(65, 3, undefined, false)).toEqual({ eligible: true });
  });
});
