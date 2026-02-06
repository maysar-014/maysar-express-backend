export interface Badge {
    id: string;
    learnerId: string;
    type: string;
    reason: string;
    metadata?: any;
    awardedAt: Date;
}

export interface IBadgeRepository {
    save(badge: Badge): Promise<void>;
    findByLearnerId(learnerId: string): Promise<Badge[]>;
    findByType(type: string): Promise<Badge[]>;
}
