import { PrismaClient } from '@prisma/client';

export interface CommunityPeerEndorsement {
  id: string;
  endorserId: string;
  endorseeId: string;
  expertiseArea: string;
  message?: string;
  createdAt: Date;
}

export class PrismaPeerEndorsementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(endorsement: CommunityPeerEndorsement): Promise<void> {
    await this.prisma.community_PeerEndorsement.create({
      data: {
        id: endorsement.id,
        endorserId: endorsement.endorserId,
        endorseeId: endorsement.endorseeId,
        expertiseArea: endorsement.expertiseArea,
        message: endorsement.message ?? null,
        createdAt: endorsement.createdAt
      }
    });
  }

  async findByEndorsee(endorseeId: string): Promise<CommunityPeerEndorsement[]> {
    const rows = await this.prisma.community_PeerEndorsement.findMany({
      where: { endorseeId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  private toDomain(row: any): CommunityPeerEndorsement {
    return {
      id: row.id,
      endorserId: row.endorserId,
      endorseeId: row.endorseeId,
      expertiseArea: row.expertiseArea,
      message: row.message ?? undefined,
      createdAt: row.createdAt
    };
  }
}
