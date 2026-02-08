import { MatchResult } from '../value-objects/match-result.value-object';

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
}
