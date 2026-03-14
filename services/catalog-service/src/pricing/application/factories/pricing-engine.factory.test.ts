jest.mock('inversify', () => ({
  injectable: () => (_target: unknown) => undefined,
  inject: () => (_target: unknown, _propertyKey: string | symbol | undefined, _parameterIndex: number) => undefined
}));

import { MaysarPricingEngine } from '../../domain/engines/maysar-pricing.engine';
import { PricingEngineFactory } from './pricing-engine.factory';

describe('PricingEngineFactory', () => {
  it('creates standalone engines for each pricing mode', () => {
    const factory = new PricingEngineFactory();

    const fastSale = factory.createEngine('FAST_SALE');
    const balanced = factory.createEngine('BALANCED');
    const maxProfit = factory.createEngine('MAX_PROFIT');

    expect(fastSale).toBeInstanceOf(MaysarPricingEngine);
    expect(balanced).toBeInstanceOf(MaysarPricingEngine);
    expect(maxProfit).toBeInstanceOf(MaysarPricingEngine);
  });
});
