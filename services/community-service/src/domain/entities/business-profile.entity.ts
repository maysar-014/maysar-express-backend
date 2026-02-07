export enum ReputationTier {
    NEWCOMER = 'NEWCOMER',
    CONTRIBUTOR = 'CONTRIBUTOR',
    EXPERT = 'EXPERT',
    MENTOR = 'MENTOR',
    THOUGHT_LEADER = 'THOUGHT_LEADER',
}

export interface ExpertiseArea {
    area: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' | 'MENTOR';
    verifiedAt?: Date;
}

export interface BusinessGoal {
    description: string;
    targetDate?: Date;
    category: string;
}

export interface LearningObjective {
    topic: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    targetCompletionDate?: Date;
}

export interface ContributionMetrics {
    helpfulAnswers: number;
    knowledgeShared: number;
    mentorshipHours: number;
    articlesPublished: number;
    challengesSolved: number;
}

export interface BusinessProfileProps {
    id: string;
    userId: string;
    businessId?: string;
    expertiseAreas: ExpertiseArea[];
    industryExperience: string[];
    certifications: string[];
    contributionScore: number;
    contributionMetrics: ContributionMetrics;
    reputationTier: ReputationTier;
    businessGoals: BusinessGoal[];
    learningObjectives: LearningObjective[];
    availableForMentorship: boolean;
    mentorshipCapacity: number;
    createdAt: Date;
    updatedAt: Date;
}

export class BusinessProfile {
    private props: BusinessProfileProps;

    constructor(props: BusinessProfileProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (!this.props.userId) {
            throw new Error('Business profile must have a userId');
        }

        if (this.props.contributionScore < 0) {
            throw new Error('Contribution score cannot be negative');
        }

        if (this.props.mentorshipCapacity < 0) {
            throw new Error('Mentorship capacity cannot be negative');
        }

        if (this.props.availableForMentorship && this.props.mentorshipCapacity === 0) {
            throw new Error('Available for mentorship requires mentorship capacity > 0');
        }
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get userId(): string {
        return this.props.userId;
    }

    get businessId(): string | undefined {
        return this.props.businessId;
    }

    get expertiseAreas(): ExpertiseArea[] {
        return [...this.props.expertiseAreas];
    }

    get industryExperience(): string[] {
        return [...this.props.industryExperience];
    }

    get certifications(): string[] {
        return [...this.props.certifications];
    }

    get contributionScore(): number {
        return this.props.contributionScore;
    }

    get contributionMetrics(): ContributionMetrics {
        return { ...this.props.contributionMetrics };
    }

    get reputationTier(): ReputationTier {
        return this.props.reputationTier;
    }

    get businessGoals(): BusinessGoal[] {
        return [...this.props.businessGoals];
    }

    get learningObjectives(): LearningObjective[] {
        return [...this.props.learningObjectives];
    }

    get availableForMentorship(): boolean {
        return this.props.availableForMentorship;
    }

    get mentorshipCapacity(): number {
        return this.props.mentorshipCapacity;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    // Business methods
    addExpertise(area: string, level: ExpertiseArea['level']): void {
        const existing = this.props.expertiseAreas.find(e => e.area === area);
        if (existing) {
            throw new Error(`Expertise area ${area} already exists`);
        }

        this.props.expertiseAreas.push({ area, level });
        this.props.updatedAt = new Date();
    }

    updateExpertiseLevel(area: string, level: ExpertiseArea['level']): void {
        const expertise = this.props.expertiseAreas.find(e => e.area === area);
        if (!expertise) {
            throw new Error(`Expertise area ${area} not found`);
        }

        expertise.level = level;
        this.props.updatedAt = new Date();
    }

    verifyExpertise(area: string): void {
        const expertise = this.props.expertiseAreas.find(e => e.area === area);
        if (!expertise) {
            throw new Error(`Expertise area ${area} not found`);
        }

        expertise.verifiedAt = new Date();
        this.props.updatedAt = new Date();
    }

    removeExpertise(area: string): void {
        this.props.expertiseAreas = this.props.expertiseAreas.filter(e => e.area !== area);
        this.props.updatedAt = new Date();
    }

    linkBusiness(businessId: string): void {
        this.props.businessId = businessId;
        this.props.updatedAt = new Date();
    }

    addIndustryExperience(industry: string): void {
        if (this.props.industryExperience.includes(industry)) {
            return;
        }
        this.props.industryExperience.push(industry);
        this.props.updatedAt = new Date();
    }

    addCertification(certification: string): void {
        if (this.props.certifications.includes(certification)) {
            return;
        }
        this.props.certifications.push(certification);
        this.props.updatedAt = new Date();
    }

    addBusinessGoal(goal: BusinessGoal): void {
        this.props.businessGoals.push(goal);
        this.props.updatedAt = new Date();
    }

    addLearningObjective(objective: LearningObjective): void {
        this.props.learningObjectives.push(objective);
        this.props.updatedAt = new Date();
    }

    updateContributionMetrics(updates: Partial<ContributionMetrics>): void {
        this.props.contributionMetrics = {
            ...this.props.contributionMetrics,
            ...updates,
        };
        this.recalculateContributionScore();
        this.updateReputationTier();
        this.props.updatedAt = new Date();
    }

    private recalculateContributionScore(): void {
        const metrics = this.props.contributionMetrics;

        // Weighted scoring formula
        const score =
            metrics.helpfulAnswers * 10 +
            metrics.knowledgeShared * 15 +
            metrics.mentorshipHours * 20 +
            metrics.articlesPublished * 25 +
            metrics.challengesSolved * 30;

        this.props.contributionScore = score;
    }

    private updateReputationTier(): void {
        const score = this.props.contributionScore;

        if (score >= 10000) {
            this.props.reputationTier = ReputationTier.THOUGHT_LEADER;
        } else if (score >= 5000) {
            this.props.reputationTier = ReputationTier.MENTOR;
        } else if (score >= 2000) {
            this.props.reputationTier = ReputationTier.EXPERT;
        } else if (score >= 500) {
            this.props.reputationTier = ReputationTier.CONTRIBUTOR;
        } else {
            this.props.reputationTier = ReputationTier.NEWCOMER;
        }
    }

    enableMentorship(capacity: number): void {
        if (this.props.reputationTier === ReputationTier.NEWCOMER ||
            this.props.reputationTier === ReputationTier.CONTRIBUTOR) {
            throw new Error('Mentorship requires EXPERT tier or higher');
        }

        if (capacity <= 0) {
            throw new Error('Mentorship capacity must be positive');
        }

        this.props.availableForMentorship = true;
        this.props.mentorshipCapacity = capacity;
        this.props.updatedAt = new Date();
    }

    disableMentorship(): void {
        this.props.availableForMentorship = false;
        this.props.mentorshipCapacity = 0;
        this.props.updatedAt = new Date();
    }

    hasExpertise(area: string, minLevel?: ExpertiseArea['level']): boolean {
        const expertise = this.props.expertiseAreas.find(e => e.area === area);
        if (!expertise) {
            return false;
        }

        if (!minLevel) {
            return true;
        }

        const levels: ExpertiseArea['level'][] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT', 'MENTOR'];
        const currentLevelIndex = levels.indexOf(expertise.level);
        const requiredLevelIndex = levels.indexOf(minLevel);

        return currentLevelIndex >= requiredLevelIndex;
    }

    toJSON(): BusinessProfileProps {
        return { ...this.props };
    }

    static create(params: {
        id: string;
        userId: string;
        businessId?: string;
    }): BusinessProfile {
        return new BusinessProfile({
            ...params,
            expertiseAreas: [],
            industryExperience: [],
            certifications: [],
            contributionScore: 0,
            contributionMetrics: {
                helpfulAnswers: 0,
                knowledgeShared: 0,
                mentorshipHours: 0,
                articlesPublished: 0,
                challengesSolved: 0,
            },
            reputationTier: ReputationTier.NEWCOMER,
            businessGoals: [],
            learningObjectives: [],
            availableForMentorship: false,
            mentorshipCapacity: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}
