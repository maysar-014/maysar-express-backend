jest.mock('inversify', () => ({
  injectable: () => (_target: unknown) => undefined,
  inject: () => (_target: unknown, _propertyKey: string | symbol | undefined, _parameterIndex: number) => undefined
}));

import { MaysarPricingEngine } from '../../domain/engines/maysar-pricing.engine';
import { PricingEngineFactory } from './pricing-engine.factory';

describe('PricingEngineFactory', () => {
  const deps = {
    core: { name: 'core' },
    validator: { name: 'validator' },
    guard: { name: 'guard' },
    rounding: { name: 'rounding' }
  };

  it('creates phase1, phase2, and phase3 engines with corresponding strategy', () => {
    const factory = new PricingEngineFactory(
      deps.core as never,
      deps.validator as never,
      deps.guard as never,
      deps.rounding as never
    );

    const phase1 = factory.createEngine('phase1') as any;
    const phase2 = factory.createEngine('phase2') as any;
    const phase3 = factory.createEngine('phase3') as any;

    expect(phase1).toBeInstanceOf(MaysarPricingEngine);
    expect(phase2).toBeInstanceOf(MaysarPricingEngine);
    expect(phase3).toBeInstanceOf(MaysarPricingEngine);
    expect(phase1.strategy.phase).toBe('phase1');
    expect(phase2.strategy.phase).toBe('phase2');
    expect(phase3.strategy.phase).toBe('phase3');
    expect(phase1.coreCalculator).toBe(deps.core);
    expect(phase1.platformValidator).toBe(deps.validator);
    expect(phase1.categoryGuard).toBe(deps.guard);
    expect(phase1.roundingService).toBe(deps.rounding);
  });
});
