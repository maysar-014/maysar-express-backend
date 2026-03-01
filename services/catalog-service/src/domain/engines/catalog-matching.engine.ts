/**
 * Catalog Matching Engine
 * 
 * Performance Envelope:
 * - Expected QPS: 10-20 (CPU intensive).
 * - Memory Limit: 256MB.
 * - Indexing Strategy: UNIQUE indexes on gtin/mpn/isbn/fingerprint.
 */

import { Product } from '../entities/product.entity';
import { MatchResult, MatchLevel } from '../value-objects/match-result.value-object';
import { ProductIdentifiers } from '../value-objects/product-identifiers.value-object';
import { ProductFingerprint } from '../value-objects/product-fingerprint.value-object';
import { MatchCriteriaBuilder } from './match-criteria.builder';
import { SimilarityAlgorithm } from '../algorithms/similarity.algorithm';
import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';

export interface ProductCandidate {
    identifiers?: ProductIdentifiers;
    fingerprint?: ProductFingerprint;
    brand: string;
    model: string;
    categoryId: string;
    attributes?: Record<string, any>;
}

export class CatalogMatchingEngine {
    /**
     * Evaluates a candidate product against a list of existing products to find a match.
     * 
     * Phased Cascade Semantics:
     * 1. Exact Match: Direct identifier equality (SKU/UPC). Threshold: 1.0.
     * 2. Strong Match: Fingerprint hash matching. Threshold: 0.95.
     * 3. Possible Match: Normalized similarity scoring. Threshold: >= 0.85.
     * 4. No Match: Fallback results.
     * 
     * @param candidate - The product data to be matched.
     * @param existingProducts - The catalog of products to compare against.
     * @returns A MatchResult with the level, score, and matched product ID.
     */
    static matchProduct(candidate: ProductCandidate, existingProducts: Product[]): MatchResult {
        // 1. Exact Match Check (Identifiers)
        if (candidate.identifiers && candidate.identifiers.hasAnyIdentifier()) {
            for (const existing of existingProducts) {
                const existingIds = existing.getIdentifiers();
                if (existingIds && candidate.identifiers.equals(existingIds)) {
                    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);
                    return new MatchResult({
                        level: MatchLevel.EXACT,
                        score: 100,
                        matchedProductId: existing.getId().toString(), // Assuming ProductId has toString()
                        criteria,
                        requiresConfirmation: false,
                    });
                }
            }
        }

        // 2. Strong Match Check (Fingerprint)
        if (candidate.fingerprint) {
            for (const existing of existingProducts) {
                const existingFingerprint = existing.getFingerprint();
                if (existingFingerprint && candidate.fingerprint.matches(existingFingerprint)) {
                    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);
                    return new MatchResult({
                        level: MatchLevel.STRONG,
                        score: 95,
                        matchedProductId: existing.getId().toString(),
                        criteria,
                        requiresConfirmation: false, // Strong matches are usually safe to auto-merge
                    });
                }
            }
        }

        // 3. Possible Match Check (Similarity)
        let bestPossibleMatch: MatchResult | null = null;
        let maxScore = 0;

        for (const existing of existingProducts) {
            // Filter by category first (should be done by query, but double check)
            if (existing.getCategoryId()?.toString() !== candidate.categoryId) continue;

            const existingBrand = existing.getBrand();
            const existingModel = existing.getModel();

            if (!existingBrand || !existingModel) continue;

            const normCandidateBrand = NormalizationAlgorithm.normalizeBrand(candidate.brand);
            const normExistingBrand = NormalizationAlgorithm.normalizeBrand(existingBrand);

            // Brand mismatch overrides similarity (unless very close typo?)
            // For now, strict on brand normalization
            if (normCandidateBrand !== normExistingBrand) continue;

            const normCandidateModel = NormalizationAlgorithm.normalizeModel(candidate.model);
            const normExistingModel = NormalizationAlgorithm.normalizeModel(existingModel);

            const similarity = SimilarityAlgorithm.calculateStringSimilarity(normCandidateModel, normExistingModel);

            if (similarity >= 0.85) {
                const score = similarity * 100;
                if (score > maxScore) {
                    maxScore = score;
                    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);
                    criteria.similarityScore = similarity;
                    criteria.brandMatch = true;
                    criteria.modelMatch = true; // High similarity implies model match

                    bestPossibleMatch = new MatchResult({
                        level: MatchLevel.POSSIBLE,
                        score: parseFloat(score.toFixed(2)),
                        matchedProductId: existing.getId().toString(),
                        criteria,
                        requiresConfirmation: true
                    });
                }
            }
        }

        if (bestPossibleMatch) {
            return bestPossibleMatch;
        }

        // 4. No Match
        return MatchResult.noMatch();
    }
}
