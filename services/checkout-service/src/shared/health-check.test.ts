import { healthCheck } from './health-check';

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const result = await healthCheck();
    expect(result.status).toBe('healthy');
  });

  it('should include timestamp', async () => {
    const result = await healthCheck();
    expect(result).toHaveProperty('timestamp');
    expect(typeof result.timestamp).toBe('number');
  });

  it('should include service name', async () => {
    const result = await healthCheck();
    expect(result).toHaveProperty('service', 'checkout-service');
  });
});
