const createdChains: Array<{
  field: string;
  calls: Array<{ method: string; args: unknown[] }>;
}> = [];

jest.mock(
  'express-validator',
  () => {
    const createChain = (field: string) => {
      const state = {
        field,
        calls: [] as Array<{ method: string; args: unknown[] }>
      };

      const proxy: Record<string, unknown> = new Proxy(
        {},
        {
          get(_target, prop: string) {
            return (...args: unknown[]) => {
              state.calls.push({ method: prop, args });
              return proxy;
            };
          }
        }
      );

      createdChains.push(state);
      return proxy;
    };

    return {
      body: createChain,
      query: createChain,
      param: createChain
    };
  },
  { virtual: true }
);

import { AnalyticsValidator } from './analytics.validator';

describe('AnalyticsValidator', () => {
  beforeEach(() => {
    createdChains.length = 0;
  });

  it('builds chain validators for analytics query', () => {
    const validators = AnalyticsValidator.getAnalytics() as unknown[];

    expect(validators.length).toBeGreaterThan(5);
    expect(createdChains.some(chain => chain.field === 'period')).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'isIn'))).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'withMessage'))).toBe(true);
  });

  it('builds chain validators for report generation', () => {
    const validators = AnalyticsValidator.generateReport() as unknown[];

    expect(validators.length).toBeGreaterThan(3);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'optional'))).toBe(true);
  });
});
