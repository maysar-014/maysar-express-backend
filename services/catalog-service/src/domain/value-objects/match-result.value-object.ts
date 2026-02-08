
export enum MatchLevel {
    EXACT = 'EXACT',
    STRONG = 'STRONG',
    POSSIBLE = 'POSSIBLE',
    NO_MATCH = 'NO_MATCH',
}

export interface MatchCriteria {
    identifierMatch?: boolean;
    fingerprintMatch?: boolean;
    brandMatch?: boolean;
    modelMatch?: boolean;
    similarityScore?: number;
    matchedField?: string;
}

export interface MatchResultProps {
    level: MatchLevel;
    score: number;
    matchedProductId?: string;
    criteria: MatchCriteria;
    requiresConfirmation: boolean;
}

export class MatchResult {
    public readonly level: MatchLevel;
    public readonly score: number;
    public readonly matchedProductId?: string;
    public readonly criteria: MatchCriteria;
    public readonly requiresConfirmation: boolean;

    constructor(props: MatchResultProps) {
        this.level = props.level;
        this.score = props.score;
        this.matchedProductId = props.matchedProductId;
        this.criteria = props.criteria;
        this.requiresConfirmation = props.requiresConfirmation;
    }

    isExactMatch(): boolean {
        return this.level === MatchLevel.EXACT;
    }

    isStrongMatch(): boolean {
        return this.level === MatchLevel.STRONG;
    }

    isPossibleMatch(): boolean {
        return this.level === MatchLevel.POSSIBLE;
    }

    isNoMatch(): boolean {
        return this.level === MatchLevel.NO_MATCH;
    }

    shouldAutoMerge(): boolean {
        return this.isExactMatch() || this.isStrongMatch();
    }

    static noMatch(): MatchResult {
        return new MatchResult({
            level: MatchLevel.NO_MATCH,
            score: 0,
            criteria: {},
            requiresConfirmation: false
        });
    }
}
