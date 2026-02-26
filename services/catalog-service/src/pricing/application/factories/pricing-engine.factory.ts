import { injectable, inject } from 'inversify';
import { TYPES } from '../../types';
import { MaysarPricingEngine } from '../../domain/engines/maysar-pricing.engine';
import { CoreCalculatorService } from '../../domain/services/core-calculator.service';
import { PlatformValidatorService } from '../../domain/services/platform-validator.service';
import { CategoryGuardService } from '../../domain/services/category-guard.service';
import { RoundingService } from '../../domain/services/rounding.service';
import { CostProtectedStrategy } from '../../domain/strategies/cost-protected.strategy';
import { AssistedPricingStrategy } from '../../domain/strategies/assisted-pricing.strategy';
import { DynamicPricingStrategy } from '../../domain/strategies/dynamic-pricing.strategy';
import { IPricingStrategy } from '../../domain/strategies/pricing-strategy.interface';

@injectable()
export class PricingEngineFactory {
    constructor(
        @inject(TYPES.CoreCalculator) private readonly coreCalculator: CoreCalculatorService,
        @inject(TYPES.PlatformValidator) private readonly platformValidator: PlatformValidatorService,
        @inject(TYPES.CategoryGuard) private readonly categoryGuard: CategoryGuardService,
        @inject(TYPES.RoundingService) private readonly roundingService: RoundingService
    ) {}

    createEngine(phase: 'phase1' | 'phase2' | 'phase3'): MaysarPricingEngine {
        let strategy: IPricingStrategy;

        switch (phase) {
            case 'phase1':
                strategy = new CostProtectedStrategy();
                break;
            case 'phase2':
                strategy = new AssistedPricingStrategy();
                break;
            case 'phase3':
                strategy = new DynamicPricingStrategy();
                break;
        }

        return new MaysarPricingEngine(
            this.coreCalculator,
            this.platformValidator,
            this.categoryGuard,
            this.roundingService,
            strategy
        );
    }
}
