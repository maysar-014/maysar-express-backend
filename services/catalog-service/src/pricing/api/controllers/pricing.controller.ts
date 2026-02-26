import { Request, Response } from 'express';
import { container } from '../../infrastructure/container';
import { TYPES } from '../../types';
import { CalculatePriceUseCase } from '../../application/use-cases/calculate-price.use-case';
import { validateCalculatePriceRequest } from '../../application/dto/pricing-request.dto';
import { PricingResultDTO } from '../../application/dto/pricing-result.dto';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

export class PricingController {
    async calculatePrice(req: Request, res: Response): Promise<void> {
        try {
            const dto = validateCalculatePriceRequest(req.body);
            const useCase = container.get<CalculatePriceUseCase>(TYPES.CalculatePriceUseCase);
            const result = useCase.execute(dto);

            const response: ApiResponse<PricingResultDTO> = {
                success: true,
                data: result
            };

            res.status(200).json(response);
        } catch (error: any) {
            if (error.name === 'ZodError') {
                const response: ApiResponse<never> = {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
                    }
                };
                res.status(400).json(response);
            } else {
                const response: ApiResponse<never> = {
                    success: false,
                    error: {
                        code: 'PRICING_ENGINE_ERROR',
                        message: error.message || 'An error occurred during price calculation'
                    }
                };
                res.status(500).json(response);
            }
        }
    }
}
