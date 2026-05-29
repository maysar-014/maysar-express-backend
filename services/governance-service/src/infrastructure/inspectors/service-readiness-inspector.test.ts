import { ServiceReadinessInspector } from './service-readiness-inspector';

describe('ServiceReadinessInspector', () => {
  it('passes when all configured services are healthy', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ status: 200, text: async () => 'ok' })
      .mockResolvedValueOnce({ status: 200, text: async () => 'ready' });

    const originalFetch = global.fetch;
    global.fetch = fetchMock as typeof fetch;

    try {
      const inspector = new ServiceReadinessInspector('OPS1.5');
      const result = await inspector.inspect(
        {
          targetBaseUrl: 'http://localhost:3000',
          rootDir: process.cwd(),
          reportDir: process.cwd(),
          constitutionPath: process.cwd()
        },
        {
          id: 'OPS1.5',
          title: 'Core Service Readiness',
          category: 'Operational',
          severity: 'P1',
          runner: 'service-readiness',
          targets: [
            { name: 'auth', url: 'http://localhost:3001/health', expectedStatus: 200 },
            { name: 'wallet', url: 'http://localhost:3002/health', expectedStatus: 200 }
          ]
        }
      );

      expect(result.status).toBe('PASS');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

