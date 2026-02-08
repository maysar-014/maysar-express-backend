import crypto from 'crypto';
import { ProductMatchRequestDto, ProductMatchResponseDto } from '../dto/matching-dto';
import { IProductRepository, IProductMatchAuditRepository, IMatchConfirmationRepository } from '../../domain/repositories/repository.interfaces';
import { CatalogMatchingEngine, ProductCandidate } from '../../domain/engines/catalog-matching.engine';
import { ProductIdentifiers } from '../../domain/value-objects/product-identifiers.value-object';
import { ProductFingerprint } from '../../domain/value-objects/product-fingerprint.value-object';
import { NormalizationAlgorithm } from '../../domain/algorithms/normalization.algorithm';
import { MatchLevel } from '../../domain/value-objects/match-result.value-object';

export class MatchProductUseCase {
    constructor(
        private readonly productRepository: IProductRepository,
        private readonly auditRepository: IProductMatchAuditRepository,
        private readonly confirmationRepository: IMatchConfirmationRepository
    ) { }

    async execute(request: ProductMatchRequestDto): Promise<ProductMatchResponseDto> {
        // 1. Normalize and prepare candidate
        const identifiers = request.identifiers
            ? new ProductIdentifiers({
                gtin: request.identifiers.gtin,
                mpn: request.identifiers.mpn,
                isbn: request.identifiers.isbn,
            })
            : undefined;

        const fingerprint = ProductFingerprint.generate({
            brand: request.brand,
            model: request.model,
            categoryId: request.categoryId,
            attributes: request.attributes,
        });

        const candidate: ProductCandidate = {
            identifiers,
            fingerprint,
            brand: request.brand,
            model: request.model,
            categoryId: request.categoryId,
            attributes: request.attributes,
        };

        // 2. Query existing products
        const normalizedBrand = NormalizationAlgorithm.normalizeBrand(request.brand);
        const existingProducts = await this.productRepository.findByCategoryAndBrand(
            request.categoryId,
            normalizedBrand
        );

        // 3. Run matching engine
        const matchResult = CatalogMatchingEngine.matchProduct(candidate, existingProducts);

        // 4. Determine decision based on match level
        let decision: 'AUTO_MERGED' | 'NEW_PRODUCT' | 'SELLER_CONFIRMED' | 'SELLER_REJECTED';
        let confirmationId: string | undefined;
        let auditMetadata: any = {};

        if (matchResult.isExactMatch() || matchResult.isStrongMatch()) {
            decision = 'AUTO_MERGED';
        } else if (matchResult.isPossibleMatch()) {
            // Provisional decision - will be updated after seller confirmation
            decision = 'NEW_PRODUCT';
            confirmationId = crypto.randomUUID();
            auditMetadata.pendingConfirmation = true;
            auditMetadata.confirmationId = confirmationId;
        } else {
            decision = 'NEW_PRODUCT';
        }

        // 5. Create audit record
        const auditId = crypto.randomUUID();
        await this.auditRepository.save({
            id: auditId,
            candidateProductId: '', // Not yet created
            matchedProductId: matchResult.matchedProductId,
            matchLevel: matchResult.level,
            matchScore: matchResult.score,
            matchingCriteria: matchResult.criteria,
            decision,
            decidedBy: 'SYSTEM',
            sellerId: request.sellerId,
            metadata: Object.keys(auditMetadata).length > 0 ? auditMetadata : undefined,
            createdAt: new Date(),
        });

        // 6. Create confirmation record for possible matches
        if (matchResult.isPossibleMatch() && confirmationId) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

            await this.confirmationRepository.save({
                id: confirmationId,
                auditId,
                sellerId: request.sellerId,
                candidateProducts: matchResult.matchedProductId ? [{
                    productId: matchResult.matchedProductId,
                    brand: request.brand,
                    model: request.model,
                    similarityScore: matchResult.criteria.similarityScore,
                    matchedFields: Object.keys(matchResult.criteria).filter(k => (matchResult.criteria as any)[k] === true),
                }] : [],
                status: 'PENDING',
                expiresAt,
                createdAt: new Date(),
            });
        }

        // 7. Return response
        if (matchResult.isExactMatch() || matchResult.isStrongMatch()) {
            return {
                matchFound: true,
                confirmationRequired: false,
                matchedProductId: matchResult.matchedProductId,
                matchLevel: matchResult.level,
            };
        } else if (matchResult.isPossibleMatch()) {
            return {
                matchFound: false,
                confirmationRequired: true,
                matchLevel: matchResult.level,
                confirmationId: confirmationId!, // From confirmation repo
                candidates: matchResult.matchedProductId ? [{
                    productId: matchResult.matchedProductId,
                    brand: request.brand,
                    model: request.model,
                    similarityScore: matchResult.criteria.similarityScore,
                    matchedFields: Object.keys(matchResult.criteria).filter(k => (matchResult.criteria as any)[k] === true),
                }] : [],
            };
        } else {
            return {
                matchFound: false,
                confirmationRequired: false,
                matchLevel: MatchLevel.NO_MATCH,
            };
        }
    }
}
