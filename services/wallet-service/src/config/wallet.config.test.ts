import { walletConfig } from './wallet.config';

describe('walletConfig', () => {
  it('exposes limits, velocity, hold, and audit settings', () => {
    expect(walletConfig.limits.dailyTransactionCount).toBe(100);
    expect(walletConfig.limits.singleTransactionMax).toBe(5000000);
    expect(walletConfig.velocity.maxTransactionsPerMinute).toBe(5);
    expect(walletConfig.velocity.suspiciousPatternThreshold).toBe(3);
    expect(walletConfig.holds.defaultExpirySeconds).toBe(86400);
    expect(walletConfig.audit.enabled).toBe(true);
  });
});
