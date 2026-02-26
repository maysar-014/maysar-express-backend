import { Money } from '../../domain/value-objects/money.value-object';
import { PriceConfiguration } from '../../domain/entities/price-configuration.entity';

export interface CalculatePriceRequestDTO {
    baseAmount: number;
    currency: string;
    configurationId: string;
}

export interface CalculatePriceResponseDTO {
    originalAmount: number;
    finalAmount: number;
    currency: string;
    appliedAdjustments: number;
}

export class CalculatePriceUseCase {
    async execute(request: CalculatePriceRequestDTO): Promise<CalculatePriceResponseDTO> {
        const basePrice = new Money(request.baseAmount, request.currency);

        // In a real implementation, we would fetch the configuration from a repository
        // For now, we'll use a dummy configuration or throw error if not found

        // Mock configuration for demonstration
        const config = new PriceConfiguration(request.configurationId, 'Default Config', []);

        const finalPrice = config.calculateFinalPrice(basePrice);

        return {
            originalAmount: basePrice.amount,
            finalAmount: finalPrice.amount,
            currency: basePrice.currency,
            appliedAdjustments: finalPrice.amount - basePrice.amount
        };
    }
}
