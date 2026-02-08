import { MatchLevel } from '../../domain/value-objects/match-result.value-object';

export interface ProductMatchRequestDto {
    brand: string;
    model: string;
    categoryId: string;
    identifiers?: {
        gtin?: string;
        mpn?: string;
        isbn?: string;
    };
    attributes?: Record<string, any>;
    sellerId: string;
}

export interface MatchCandidateDto {
    productId: string;
    brand: string;
    model: string;
    similarityScore?: number;
    matchedFields: string[];
}

export interface ProductMatchResponseDto {
    matchFound: boolean; // True for EXACT/STRONG
    confirmationRequired: boolean; // True for POSSIBLE
    matchedProductId?: string;
    confirmationId?: string;
    candidates?: MatchCandidateDto[];
    matchLevel: MatchLevel;
}

export interface MatchConfirmationRequestDto {
    choice: 'confirm' | 'reject'; // In simple flow, confirm implies selecting the single candidate presented or 'new' if reject
    selectedProductId?: string; // If choice is confirm and multiple candidates were presented (future proofing)
}

export interface MatchConfirmationResponseDto {
    success: boolean;
    actionTaken: 'merged' | 'created_new';
    finalProductId: string;
}

export interface MatchAuditDto {
    id: string;
    candidateProductId: string;
    matchLevel: string;
    decision: string;
    createdAt: Date;
}
