// @ts-nocheck
import { injectable } from 'inversify';
import { MaysarPricingEngine, PricingMode } from '../../domain/engines/maysar-pricing.engine';

@injectable()
export class PricingEngineFactory {
    createEngine(_mode?: PricingMode): MaysarPricingEngine {
        return new MaysarPricingEngine();
    }
}
