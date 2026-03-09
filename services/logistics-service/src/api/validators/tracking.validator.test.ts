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

import { TrackingValidator } from './tracking.validator';

describe('TrackingValidator', () => {
  beforeEach(() => {
    createdChains.length = 0;
  });

  it('builds chain validators for location updates', () => {
    const validators = TrackingValidator.storeLocationUpdate() as unknown[];

    expect(validators.length).toBeGreaterThan(8);
    expect(createdChains.some(chain => chain.field === 'location.latitude')).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'isFloat'))).toBe(true);
  });

  it('builds chain validators for live tracking queries', () => {
    const validators = TrackingValidator.getLiveTracking() as unknown[];

    expect(validators.length).toBeGreaterThan(0);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'matches'))).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'isInt'))).toBe(true);
  });
});
