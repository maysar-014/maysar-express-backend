export interface AwardBadgeRequest {
    learnerId: string;
    badgeType: string;
    reason: string;
    metadata?: Record<string, any>;
}

export interface AwardBadgeResponse {
    badgeId: string;
    learnerId: string;
    badgeType: string;
    awardedAt: Date;
}
