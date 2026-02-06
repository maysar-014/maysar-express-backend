export interface BadgeEarnedEvent {
    learnerId: string;
    learnerRole: string;
    badgeId: string;
    badgeName: string;
    earnedAt: Date;
    criteria: string;
    correlationId?: string;
}
