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
import { MatchAuditRecord } from '../value-objects/match-audit-record.value-object';
import {
  SpecificationEvaluationGuard,
  CategoryAttributeSchema,
} from './specification-evaluation-guard';

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
     * 3. Possible Match: Normalized similarity scoring + SpecificationEvaluationGuard gate.
     *    Threshold: >= 0.85 AND agreementLevel !== 'CONTRADICTED'.
     * 4. No Match: Fallback results.
     *
     * @param candidate - The product data to be matched.
     * @param existingProducts - The catalog of products to compare against.
     * @param attributeSchemas - Optional category attribute schemas for identity-relevant comparison.
     * @returns A MatchResult with the level, score, matched product ID, and audit record.
     */
    static matchProduct(
        candidate: ProductCandidate,
        existingProducts: Product[],
        attributeSchemas: CategoryAttributeSchema[] = [],
    ): MatchResult {
        // 1. Exact Match Check (Identifiers)
        if (candidate.identifiers && candidate.identifiers.hasAnyIdentifier()) {
            for (const existing of existingProducts) {
                const existingIds = existing.getIdentifiers();
                if (existingIds && candidate.identifiers.equals(existingIds)) {
                    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);
                    return new MatchResult({
                        level: MatchLevel.EXACT,
                        score: 100,
                        matchedProductId: existing.getId().toString(),
                        criteria,
                        requiresConfirmation: false,
                        auditRecord: new MatchAuditRecord({
                            matchLevel: MatchLevel.EXACT,
                            matchedProductId: existing.getId().toString(),
                            decidedAt: new Date(),
                        }),
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
                        requiresConfirmation: false,
                        auditRecord: new MatchAuditRecord({
                            matchLevel: MatchLevel.STRONG,
                            matchedProductId: existing.getId().toString(),
                            decidedAt: new Date(),
                        }),
                    });
                }
            }
        }

        // 3. Possible Match Check (Similarity + Specification Guard)
        let bestPossibleMatch: MatchResult | null = null;
        let maxScore = 0;

        for (const existing of existingProducts) {
            // Filter by category first
            if (existing.getCategoryId()?.toString() !== candidate.categoryId) continue;

            const existingBrand = existing.getBrand();
            const existingModel = existing.getModel();

            if (!existingBrand || !existingModel) continue;

            const normCandidateBrand = NormalizationAlgorithm.normalizeBrand(candidate.brand);
            const normExistingBrand = NormalizationAlgorithm.normalizeBrand(existingBrand);

            // Brand must match (strict normalization)
            if (normCandidateBrand !== normExistingBrand) continue;

            const normCandidateModel = NormalizationAlgorithm.normalizeModel(candidate.model);
            const normExistingModel = NormalizationAlgorithm.normalizeModel(existingModel);

            const similarity = SimilarityAlgorithm.calculateStringSimilarity(
                normCandidateModel,
                normExistingModel,
            );

            if (similarity >= 0.85) {
                // ── Specification Guard ──────────────────────────────────────
                const specResult = SpecificationEvaluationGuard.evaluate(
                    candidate,
                    existing,
                    attributeSchemas,
                );

                if (specResult.agreementLevel === 'CONTRADICTED') {
                    // Do not emit POSSIBLE — specifications contradict product identity
                    continue;
                }
                // ────────────────────────────────────────────────────────────

                const score = similarity * 100;
                if (score > maxScore) {
                    maxScore = score;
                    const criteria = MatchCriteriaBuilder.buildCriteria(candidate, existing);
                    criteria.similarityScore = similarity;
                    criteria.brandMatch = true;
                    criteria.modelMatch = true;

                    bestPossibleMatch = new MatchResult({
                        level: MatchLevel.POSSIBLE,
                        score: parseFloat(score.toFixed(2)),
                        matchedProductId: existing.getId().toString(),
                        criteria,
                        requiresConfirmation: true,
                        auditRecord: new MatchAuditRecord({
                            matchLevel: MatchLevel.POSSIBLE,
                            similarityScore: similarity,
                            agreementLevel: specResult.agreementLevel,
                            dimensions: specResult.dimensions,
                            matchedProductId: existing.getId().toString(),
                            decidedAt: new Date(),
                        }),
                    });
                }
            }
        }

        if (bestPossibleMatch) {
            return bestPossibleMatch;
        }

        // 4. No Match
        return MatchResult.noMatch(
            new MatchAuditRecord({
                matchLevel: MatchLevel.NO_MATCH,
                decidedAt: new Date(),
            }),
        );
    }
}
