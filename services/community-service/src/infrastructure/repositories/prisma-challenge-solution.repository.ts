import { PrismaClient } from '@prisma/client';

export interface CommunityChallengeSolution {
  id: string;
  challengeId: string;
  authorId: string;
  solution: string;
  approach: string;
  implementation?: string;
  isAccepted: boolean;
  votes: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaChallengeSolutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(solution: CommunityChallengeSolution): Promise<void> {
    await this.prisma.community_ChallengeSolution.create({
      data: {
        id: solution.id,
        challengeId: solution.challengeId,
        authorId: solution.authorId,
        solution: solution.solution,
        approach: solution.approach,
        implementation: solution.implementation ?? null,
        isAccepted: solution.isAccepted,
        votes: solution.votes,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt
      }
    });
  }

  async findByChallengeId(challengeId: string): Promise<CommunityChallengeSolution[]> {
    const rows = await this.prisma.community_ChallengeSolution.findMany({
      where: { challengeId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  private toDomain(row: any): CommunityChallengeSolution {
    return {
      id: row.id,
      challengeId: row.challengeId,
      authorId: row.authorId,
      solution: row.solution,
      approach: row.approach,
      implementation: row.implementation ?? undefined,
      isAccepted: row.isAccepted,
      votes: row.votes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
