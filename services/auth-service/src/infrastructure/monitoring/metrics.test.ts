import metrics, { businessMetrics, metricsCollector, metricsRegistry, register } from './metrics';

describe('auth monitoring metrics', () => {
  it('exports metrics instances and registry aliases', () => {
    expect(metrics).toBeDefined();
    expect(metricsCollector).toBeDefined();
    expect(metricsRegistry).toBeDefined();
    expect(register).toBe(metricsRegistry);
  });

  it('registers business counters in the shared registry', () => {
    expect(metricsRegistry.getSingleMetric('auth_service_login_attempts_total')).toBeDefined();
    expect(metricsRegistry.getSingleMetric('auth_service_token_refreshes_total')).toBeDefined();
    expect(metricsRegistry.getSingleMetric('auth_service_2fa_verifications_total')).toBeDefined();

    businessMetrics.loginAttemptsTotal.inc();
    businessMetrics.tokenRefreshesTotal.inc();
    businessMetrics.twoFaVerificationsTotal.inc();
  });
});
