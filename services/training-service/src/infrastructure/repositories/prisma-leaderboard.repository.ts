import { PrismaClient } from '@prisma/client';
import { ILeaderboardRepository, LeaderboardEntry } from '../../domain/repositories/leaderboard.repository';

interface LeaderboardDelegate {
    upsert(args: Record<string, unknown>): Promise<unknown>;
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
    count(args: Record<string, unknown>): Promise<number>;
}

export class PrismaLeaderboardRepository implements ILeaderboardRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async updateEntry(entry: Partial<LeaderboardEntry> & { learnerId: string }): Promise<void> {
        const { learnerId, ...data } = entry;
        await this.leaderboardDelegate.upsert({
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
        const entries = await this.leaderboardDelegate.findMany({
            take: limit,
            orderBy: {
                totalScore: 'desc'
            }
        });
        return entries as LeaderboardEntry[];
    }

    public async getLearnerRank(learnerId: string): Promise<number> {
        const entry = await this.leaderboardDelegate.findUnique({
            where: { learnerId }
        });

        if (!entry) return 0;
        const typedEntry = entry as LeaderboardEntry;

        const count = await this.leaderboardDelegate.count({
            where: {
                totalScore: {
                    gt: typedEntry.totalScore
                }
            }
        });

        return count + 1;
    }

    public async getEntry(learnerId: string): Promise<LeaderboardEntry | null> {
        const entry = await this.leaderboardDelegate.findUnique({
            where: { learnerId }
        });
        return entry as LeaderboardEntry | null;
    }

    private get leaderboardDelegate(): LeaderboardDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.leaderboardEntry ??
            client.training_LeaderboardEntry) as LeaderboardDelegate | undefined;
        if (!delegate) {
            throw new Error('Leaderboard delegate is not configured on prisma client');
        }
        return delegate;
    }
}
