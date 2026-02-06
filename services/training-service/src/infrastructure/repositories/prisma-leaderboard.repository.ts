import { PrismaClient } from '@prisma/client';
import { ILeaderboardRepository, LeaderboardEntry } from '../../domain/repositories/leaderboard.repository';

export class PrismaLeaderboardRepository implements ILeaderboardRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async updateEntry(entry: Partial<LeaderboardEntry> & { learnerId: string }): Promise<void> {
        const { learnerId, ...data } = entry;
        await this.prisma.leaderboardEntry.upsert({
            where: { learnerId },
            update: data,
            create: {
                learnerId,
                totalScore: data.totalScore || 0,
                modulesCount: data.modulesCount || 0,
                badgesCount: data.badgesCount || 0
            }
        });
    }

    public async getTop(limit: number): Promise<LeaderboardEntry[]> {
        const entries = await this.prisma.leaderboardEntry.findMany({
            take: limit,
            orderBy: {
                totalScore: 'desc'
            }
        });
        return entries as LeaderboardEntry[];
    }

    public async getLearnerRank(learnerId: string): Promise<number> {
        const entry = await this.prisma.leaderboardEntry.findUnique({
            where: { learnerId }
        });

        if (!entry) return 0;

        const count = await this.prisma.leaderboardEntry.count({
            where: {
                totalScore: {
                    gt: entry.totalScore
                }
            }
        });

        return count + 1;
    }

    public async getEntry(learnerId: string): Promise<LeaderboardEntry | null> {
        const entry = await this.prisma.leaderboardEntry.findUnique({
            where: { learnerId }
        });
        return entry as LeaderboardEntry | null;
    }
}
