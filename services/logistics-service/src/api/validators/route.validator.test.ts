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

import { RouteValidator } from './route.validator';

describe('RouteValidator', () => {
  beforeEach(() => {
    createdChains.length = 0;
  });

  it('builds chain validators for route optimization', () => {
    const validators = RouteValidator.optimizeRoute() as unknown[];

    expect(validators.length).toBeGreaterThan(10);
    expect(createdChains.some(chain => chain.field === 'deliveries')).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'isArray'))).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'custom'))).toBe(true);
  });

  it('builds chain validators for getRoute lookup', () => {
    const validators = RouteValidator.getRoute() as unknown[];

    expect(validators.length).toBeGreaterThan(0);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'notEmpty'))).toBe(true);
    expect(createdChains.some(chain => chain.calls.some(call => call.method === 'isLength'))).toBe(true);
  });
});
