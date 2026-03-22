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

    private warnedMissingDelegate = false;
    private readonly fallbackEntries = new Map<string, LeaderboardEntry>();

    private warnMissingDelegate(message: string): void {
        if (this.warnedMissingDelegate) return;
        this.warnedMissingDelegate = true;
        console.warn(message);
    }

    public async updateEntry(entry: Partial<LeaderboardEntry> & { learnerId: string }): Promise<void> {
        const { learnerId, ...data } = entry;
        const delegate = this.leaderboardDelegate;
        if (!delegate) {
            const existing = this.fallbackEntries.get(learnerId) || {
                learnerId,
                totalScore: 0,
                modulesCount: 0,
                badgesCount: 0
            };
            this.fallbackEntries.set(learnerId, { ...existing, ...data, learnerId });
            return;
        }

        try {
            await delegate.upsert({
                where: { learnerId },
                update: data,
                create: {
                    learnerId,
                    totalScore: data.totalScore || 0,
                    modulesCount: data.modulesCount || 0,
                    badgesCount: data.badgesCount || 0
                }
            });
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Leaderboard update failed; using fallback.');
                const existing = this.fallbackEntries.get(learnerId) || {
                    learnerId,
                    totalScore: 0,
                    modulesCount: 0,
                    badgesCount: 0
                };
                this.fallbackEntries.set(learnerId, { ...existing, ...data, learnerId });
                return;
            }
            throw error;
        }
    }

    public async getTop(limit: number): Promise<LeaderboardEntry[]> {
        const delegate = this.leaderboardDelegate;
        if (!delegate) {
            return Array.from(this.fallbackEntries.values())
                .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                .slice(0, limit);
        }

        try {
            const entries = await delegate.findMany({
                take: limit,
                orderBy: {
                    totalScore: 'desc'
                }
            });
            return entries as LeaderboardEntry[];
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Leaderboard lookup failed; using fallback.');
                return Array.from(this.fallbackEntries.values())
                    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
                    .slice(0, limit);
            }
            throw error;
        }
    }

    public async getLearnerRank(learnerId: string): Promise<number> {
        const delegate = this.leaderboardDelegate;
        if (!delegate) {
            const entries = Array.from(this.fallbackEntries.values()).sort(
                (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
            );
            const index = entries.findIndex((entry) => entry.learnerId === learnerId);
            return index === -1 ? 0 : index + 1;
        }

        try {
            const entry = await delegate.findUnique({
                where: { learnerId }
            });

            if (!entry) return 0;
            const typedEntry = entry as LeaderboardEntry;

            const count = await delegate.count({
                where: {
                    totalScore: {
                        gt: typedEntry.totalScore
                    }
                }
            });

            return count + 1;
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Leaderboard rank lookup failed; using fallback.');
                const entries = Array.from(this.fallbackEntries.values()).sort(
                    (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
                );
                const index = entries.findIndex((entry) => entry.learnerId === learnerId);
                return index === -1 ? 0 : index + 1;
            }
            throw error;
        }
    }

    public async getEntry(learnerId: string): Promise<LeaderboardEntry | null> {
        const delegate = this.leaderboardDelegate;
        if (!delegate) {
            return this.fallbackEntries.get(learnerId) || null;
        }

        try {
            const entry = await delegate.findUnique({
                where: { learnerId }
            });
            return entry as LeaderboardEntry | null;
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Leaderboard entry lookup failed; using fallback.');
                return this.fallbackEntries.get(learnerId) || null;
            }
            throw error;
        }
    }

    private get leaderboardDelegate(): LeaderboardDelegate | null {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.leaderboardEntry ??
            client.training_LeaderboardEntry) as LeaderboardDelegate | undefined;
        if (!delegate) {
            this.warnMissingDelegate('[training] Leaderboard delegate missing; using fallback.');
            return null;
        }
        return delegate;
    }
}
