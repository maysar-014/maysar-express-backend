export interface LeaderboardUpdatedEvent {
    learnerId: string;
    learnerRole: string;
    rank: number;
    totalPoints: number;
    updatedAt: Date;
    correlationId?: string;
}
