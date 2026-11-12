import { MatchResult } from '../value-objects/match-result.value-object';
import { MatchAuditRecord } from '../value-objects/match-audit-record.value-object';

export class CatalogMatchingPolicy {
    // Configurable thresholds could be injected in a real scenario
    private static readonly CONFIRMATION_TIMEOUT_HOURS = 24;
    private static readonly MAX_CANDIDATES_FOR_CONFIRMATION = 5;

    /**
     * Determines if a match result is sufficient for automatic merging without user intervention.
     */
    static canAutoMerge(matchResult: MatchResult): boolean {
        return matchResult.shouldAutoMerge();
    }

    /**
     * Determines if a match result requires seller confirmation.
     */
    static requiresSellerConfirmation(matchResult: MatchResult): boolean {
        return matchResult.requiresConfirmation || matchResult.isPossibleMatch();
    }

    /**
     * Determines if a new product should be created (no match found).
     */
    static shouldCreateNewProduct(matchResult: MatchResult): boolean {
        return matchResult.isNoMatch();
    }

    static getConfirmationTimeout(): number {
        return this.CONFIRMATION_TIMEOUT_HOURS;
    }

    static getMaxCandidatesForConfirmation(): number {
        return this.MAX_CANDIDATES_FOR_CONFIRMATION;
    }

    /**
     * Formal gate that determines whether a match result may be presented to a seller
     * as a merge suggestion. Uses the audit record to block suggestions for pairs where
     * specification evidence contradicts product identity.
     *
     * - EXACT / STRONG → always true (sufficient evidence by definition)
     * - POSSIBLE with CONTRADICTED agreement → false (never suggest)
     * - POSSIBLE with CONFIRMED or INSUFFICIENT agreement → true (seller confirms)
     * - NO_MATCH → false
     */
    static canSuggestMerge(matchResult: MatchResult, auditRecord: MatchAuditRecord): boolean {
        if (matchResult.isExactMatch() || matchResult.isStrongMatch()) return true;
        if (matchResult.isNoMatch()) return false;
        // POSSIBLE match — gate on specification agreement level
        return auditRecord.agreementLevel !== 'CONTRADICTED';
    }
}
