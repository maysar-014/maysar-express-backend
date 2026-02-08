import { ProductMatchRequestDto, ProductMatchResponseDto } from '../dto/matching-dto';
import { MatchProductUseCase } from './match-product.use-case';
import { IProductRepository } from '../../domain/repositories/repository.interfaces';
import { CatalogMatchingPolicy } from '../../domain/policies/catalog-matching.policy';

export class CreateProductWithMatchingUseCase {
    constructor(
        private readonly matchProductUseCase: MatchProductUseCase,
        private readonly productRepository: IProductRepository
    ) { }

    async execute(request: ProductMatchRequestDto): Promise<ProductMatchResponseDto> {
        // 1. Run match-product use case
        const matchResult = await this.matchProductUseCase.execute(request);

        // 2. If auto-merge (EXACT/STRONG): return matched product
        if (matchResult.matchFound && !matchResult.confirmationRequired) {
            // In a real scenario, we might create a seller offer for the existing product here
            // For now, just return the match result
            return matchResult;
        }

        // 3. If confirmation required (POSSIBLE): return pending status
        if (matchResult.confirmationRequired) {
            return matchResult;
        }

        // 4. If no match: proceed with product creation (would be handled by caller)
        return matchResult;
    }
}
