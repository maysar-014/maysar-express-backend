export interface ContributionScoreProps {
    score: number;
    answerAcceptanceRate: number;
    peerUpvotes: number;
    expertEndorsements: number;
    lastContributionAt: Date;
    qualityMultiplier: number;
}

export class ContributionScore {
    private props: ContributionScoreProps;
    private static readonly DECAY_DAYS = 90;
    private static readonly MIN_SCORE = 0;

    constructor(props: ContributionScoreProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (this.props.score < ContributionScore.MIN_SCORE) {
            throw new Error(`Score cannot be less than ${ContributionScore.MIN_SCORE}`);
        }

        if (this.props.answerAcceptanceRate < 0 || this.props.answerAcceptanceRate > 1) {
            throw new Error('Answer acceptance rate must be between 0 and 1');
        }

        if (this.props.peerUpvotes < 0) {
            throw new Error('Peer upvotes cannot be negative');
        }

        if (this.props.expertEndorsements < 0) {
            throw new Error('Expert endorsements cannot be negative');
        }

        if (this.props.qualityMultiplier < 1) {
            throw new Error('Quality multiplier must be at least 1');
        }
    }

    // Getters
    get score(): number {
        return this.applyDecay();
    }

    get rawScore(): number {
        return this.props.score;
    }

    get answerAcceptanceRate(): number {
        return this.props.answerAcceptanceRate;
    }

    get peerUpvotes(): number {
        return this.props.peerUpvotes;
    }

    get expertEndorsements(): number {
        return this.props.expertEndorsements;
    }

    get lastContributionAt(): Date {
        return this.props.lastContributionAt;
    }

    get qualityMultiplier(): number {
        return this.props.qualityMultiplier;
    }

    // Business methods
    private applyDecay(): number {
        const daysSinceLastContribution = Math.floor(
            (new Date().getTime() - this.props.lastContributionAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastContribution <= ContributionScore.DECAY_DAYS) {
            return this.props.score;
        }

        const decayPeriods = Math.floor(daysSinceLastContribution / ContributionScore.DECAY_DAYS);
        const decayFactor = Math.pow(0.9, decayPeriods); // 10% decay per period

        return Math.max(
            ContributionScore.MIN_SCORE,
            Math.floor(this.props.score * decayFactor)
        );
    }

    addContribution(points: number): void {
        if (points <= 0) {
            throw new Error('Contribution points must be positive');
        }

        const qualifiedPoints = Math.floor(points * this.props.qualityMultiplier);
        this.props.score += qualifiedPoints;
        this.props.lastContributionAt = new Date();
    }

    recordAnswer(isAccepted: boolean, totalAnswers: number, acceptedAnswers: number): void {
        if (totalAnswers === 0) {
            throw new Error('Total answers must be greater than 0');
        }

        const newAcceptedCount = acceptedAnswers + (isAccepted ? 1 : 0);
        const newTotalCount = totalAnswers + 1;

        this.props.answerAcceptanceRate = newAcceptedCount / newTotalCount;
        this.props.lastContributionAt = new Date();
    }

    addPeerUpvote(): void {
        this.props.peerUpvotes += 1;
    }

    addExpertEndorsement(): void {
        this.props.expertEndorsements += 1;
        // Expert endorsements have bonus impact
        this.addContribution(50);
    }

    updateQualityMultiplier(): void {
        // Calculate quality multiplier based on metrics
        let multiplier = 1.0;

        // Answer acceptance rate bonus (up to +50%)
        multiplier += this.props.answerAcceptanceRate * 0.5;

        // Expert endorsement bonus (up to +30%)
        const endorsementBonus = Math.min(this.props.expertEndorsements / 20, 0.3);
        multiplier += endorsementBonus;

        // Peer upvote bonus (up to +20%)
        const upvoteBonus = Math.min(this.props.peerUpvotes / 100, 0.2);
        multiplier += upvoteBonus;

        this.props.qualityMultiplier = Math.round(multiplier * 100) / 100;
    }

    isActive(): boolean {
        const daysSinceLastContribution = Math.floor(
            (new Date().getTime() - this.props.lastContributionAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        return daysSinceLastContribution <= 30;
    }

    getTier(): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' {
        const score = this.score;

        if (score >= 10000) return 'DIAMOND';
        if (score >= 5000) return 'PLATINUM';
        if (score >= 2000) return 'GOLD';
        if (score >= 500) return 'SILVER';
        return 'BRONZE';
    }

    meetsMinimumThreshold(threshold: number): boolean {
        return this.score >= threshold;
    }

    toJSON(): ContributionScoreProps {
        return {
            ...this.props,
            score: this.score, // Return decayed score
        };
    }

    static create(): ContributionScore {
        return new ContributionScore({
            score: 0,
            answerAcceptanceRate: 0,
            peerUpvotes: 0,
            expertEndorsements: 0,
            lastContributionAt: new Date(),
            qualityMultiplier: 1.0,
        });
    }

    static fromData(data: ContributionScoreProps): ContributionScore {
        return new ContributionScore(data);
    }
}
