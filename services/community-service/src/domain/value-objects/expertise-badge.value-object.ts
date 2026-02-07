export type ExpertiseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'MENTOR';

export interface ExpertiseBadgeProps {
    area: string;
    level: ExpertiseLevel;
    verifiedAt?: Date;
    verifiedBy?: string;
    expiresAt?: Date;
    peerEndorsements: string[];
    trainingCompletions: string[];
    businessVerified: boolean;
}

export class ExpertiseBadge {
    private props: ExpertiseBadgeProps;

    constructor(props: ExpertiseBadgeProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (!this.props.area || this.props.area.trim().length === 0) {
            throw new Error('Expertise badge must have an area');
        }

        if (this.props.peerEndorsements.length > 0 && this.props.peerEndorsements.length !== new Set(this.props.peerEndorsements).size) {
            throw new Error('Peer endorsements must be unique');
        }

        if (this.props.expiresAt && this.props.expiresAt < new Date()) {
            throw new Error('Expiration date cannot be in the past');
        }
    }

    // Getters
    get area(): string {
        return this.props.area;
    }

    get level(): ExpertiseLevel {
        return this.props.level;
    }

    get verifiedAt(): Date | undefined {
        return this.props.verifiedAt;
    }

    get verifiedBy(): string | undefined {
        return this.props.verifiedBy;
    }

    get expiresAt(): Date | undefined {
        return this.props.expiresAt;
    }

    get peerEndorsements(): string[] {
        return [...this.props.peerEndorsements];
    }

    get trainingCompletions(): string[] {
        return [...this.props.trainingCompletions];
    }

    get businessVerified(): boolean {
        return this.props.businessVerified;
    }

    // Business methods
    addPeerEndorsement(userId: string): void {
        if (this.props.peerEndorsements.includes(userId)) {
            return;
        }

        this.props.peerEndorsements.push(userId);
    }

    addTrainingCompletion(moduleId: string): void {
        if (this.props.trainingCompletions.includes(moduleId)) {
            return;
        }

        this.props.trainingCompletions.push(moduleId);
    }

    verify(verifiedBy: string, expiresAt?: Date): void {
        this.props.verifiedAt = new Date();
        this.props.verifiedBy = verifiedBy;

        if (expiresAt) {
            if (expiresAt < new Date()) {
                throw new Error('Expiration date cannot be in the past');
            }
            this.props.expiresAt = expiresAt;
        }
    }

    markBusinessVerified(): void {
        this.props.businessVerified = true;
    }

    isExpired(): boolean {
        if (!this.props.expiresAt) {
            return false;
        }

        return this.props.expiresAt < new Date();
    }

    isVerified(): boolean {
        return !!this.props.verifiedAt && !this.isExpired();
    }

    meetsEndorsementRequirement(minEndorsements: number): boolean {
        return this.props.peerEndorsements.length >= minEndorsements;
    }

    meetsTrainingRequirement(minCompletions: number): boolean {
        return this.props.trainingCompletions.length >= minCompletions;
    }

    canUpgradeToLevel(level: ExpertiseLevel, requirements: {
        minEndorsements: number;
        minTrainingCompletions: number;
        requireBusinessVerification: boolean;
    }): boolean {
        const levels: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'];
        const currentLevelIndex = levels.indexOf(this.props.level);
        const targetLevelIndex = levels.indexOf(level);

        if (targetLevelIndex <= currentLevelIndex) {
            return false;
        }

        if (!this.meetsEndorsementRequirement(requirements.minEndorsements)) {
            return false;
        }

        if (!this.meetsTrainingRequirement(requirements.minTrainingCompletions)) {
            return false;
        }

        if (requirements.requireBusinessVerification && !this.props.businessVerified) {
            return false;
        }

        return true;
    }

    upgradeLevel(newLevel: ExpertiseLevel): void {
        const levels: ExpertiseLevel[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'];
        const currentLevelIndex = levels.indexOf(this.props.level);
        const newLevelIndex = levels.indexOf(newLevel);

        if (newLevelIndex <= currentLevelIndex) {
            throw new Error('Can only upgrade to a higher level');
        }

        this.props.level = newLevel;
    }

    renew(expiresAt: Date): void {
        if (!this.isExpired()) {
            throw new Error('Can only renew expired badges');
        }

        if (expiresAt < new Date()) {
            throw new Error('Expiration date cannot be in the past');
        }

        this.props.expiresAt = expiresAt;
    }

    toJSON(): ExpertiseBadgeProps {
        return { ...this.props };
    }

    static create(area: string, level: ExpertiseLevel): ExpertiseBadge {
        return new ExpertiseBadge({
            area,
            level,
            peerEndorsements: [],
            trainingCompletions: [],
            businessVerified: false,
        });
    }
}
