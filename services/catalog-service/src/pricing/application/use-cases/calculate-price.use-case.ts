import { inject, injectable } from 'inversify';
import { PricingEngineFactory } from '../factories/pricing-engine.factory';
import { TYPES } from '../../types';
import { CalculatePriceRequestDTO } from '../dto/pricing-request.dto';
import { PricingResultDTO } from '../dto/pricing-result.dto';

@injectable()
export class CalculatePriceUseCase {
    constructor(
        @inject(TYPES.PricingEngineFactory) private readonly engineFactory: PricingEngineFactory
    ) {}

    execute(request: CalculatePriceRequestDTO): PricingResultDTO {
        const engine = this.engineFactory.createEngine(request.pricing_mode);
        return engine.calculate(request);
    }
}
