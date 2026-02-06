export interface LeaderboardEntry {
    learnerId: string;
    totalScore: number;
    modulesCount: number;
    badgesCount: number;
    updatedAt: Date;
}

export interface ILeaderboardRepository {
    updateEntry(entry: Partial<LeaderboardEntry> & { learnerId: string }): Promise<void>;
    getTop(limit: number): Promise<LeaderboardEntry[]>;
    getLearnerRank(learnerId: string): Promise<number>;
    getEntry(learnerId: string): Promise<LeaderboardEntry | null>;
}
