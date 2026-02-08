import { MatchCriteria } from '../value-objects/match-result.value-object';
import { ProductIdentifiers } from '../value-objects/product-identifiers.value-object';
import { ProductFingerprint } from '../value-objects/product-fingerprint.value-object';
import { Product } from '../entities/product.entity';
import { SimilarityAlgorithm } from '../algorithms/similarity.algorithm';
import { NormalizationAlgorithm } from '../algorithms/normalization.algorithm';

interface CandidateData {
    identifiers?: ProductIdentifiers;
    fingerprint?: ProductFingerprint;
    brand: string;
    model: string;
}

export class MatchCriteriaBuilder {
    static buildCriteria(candidate: CandidateData, existing: Product): MatchCriteria {
        const criteria: MatchCriteria = {};
        const existingIds = existing.getIdentifiers();
        const existingFingerprint = existing.getFingerprint();

        // 1. Identifier Match
        if (candidate.identifiers && existingIds && candidate.identifiers.equals(existingIds)) {
            criteria.identifierMatch = true;
            if (candidate.identifiers.gtin === existingIds.gtin && candidate.identifiers.gtin) criteria.matchedField = 'gtin';
            else if (candidate.identifiers.mpn === existingIds.mpn && candidate.identifiers.mpn) criteria.matchedField = 'mpn';
            else if (candidate.identifiers.isbn === existingIds.isbn && candidate.identifiers.isbn) criteria.matchedField = 'isbn';
        }

        // 2. Fingerprint Match
        if (candidate.fingerprint && existingFingerprint && candidate.fingerprint.matches(existingFingerprint)) {
            criteria.fingerprintMatch = true;
        }

        // 3. Brand & Model Match
        const normCandidateBrand = NormalizationAlgorithm.normalizeBrand(candidate.brand);
        const normExistingBrand = NormalizationAlgorithm.normalizeBrand(existing.getBrand() || '');

        if (normCandidateBrand === normExistingBrand) {
            criteria.brandMatch = true;
        }

        const normCandidateModel = NormalizationAlgorithm.normalizeModel(candidate.model);
        const normExistingModel = NormalizationAlgorithm.normalizeModel(existing.getModel() || '');

        if (normCandidateModel === normExistingModel) {
            criteria.modelMatch = true;
        } else {
            // Calculate similarity if not exact match, to populate the score
            const similarity = SimilarityAlgorithm.calculateStringSimilarity(normCandidateModel, normExistingModel);
            criteria.similarityScore = parseFloat(similarity.toFixed(2));
        }

        return criteria;
    }
}
