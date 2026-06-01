import { PrismaClient } from '@prisma/client';
import {
  ICODIdentityLinksRepository,
  IdentityLink,
  IdentityAttributeType,
} from '../../domain/repositories/cod-identity-links.repository';
import { databaseManager } from '../../config/database.config';

export class PrismaCODIdentityLinksRepository implements ICODIdentityLinksRepository {
  private get prisma(): PrismaClient {
    return databaseManager.getPrisma();
  }

  async save(link: IdentityLink): Promise<void> {
    await (this.prisma as any).order_CODIdentityLink.upsert({
      where: { id: link.id },
      create: {
        id: link.id,
        accountAId: link.accountAId,
        accountBId: link.accountBId,
        attributeType: link.attributeType,
        attributeHash: link.attributeHash,
        disputedAt: link.disputedAt,
        createdAt: link.createdAt,
      },
      update: {
        disputedAt: link.disputedAt,
      },
    });
  }

  async findByAccountId(accountId: string): Promise<IdentityLink[]> {
    const records = await (this.prisma as any).order_CODIdentityLink.findMany({
      where: {
        OR: [{ accountAId: accountId }, { accountBId: accountId }],
      },
    });

    return records.map(this.toIdentityLink);
  }

  async findByAttributeHash(hash: string): Promise<IdentityLink[]> {
    const records = await (this.prisma as any).order_CODIdentityLink.findMany({
      where: { attributeHash: hash },
    });

    return records.map(this.toIdentityLink);
  }

  async setDisputedAt(linkId: string, disputedAt: Date): Promise<void> {
    await (this.prisma as any).order_CODIdentityLink.update({
      where: { id: linkId },
      data: { disputedAt },
    });
  }

  private toIdentityLink(record: any): IdentityLink {
    return {
      id: record.id,
      accountAId: record.accountAId,
      accountBId: record.accountBId,
      attributeType: record.attributeType as IdentityAttributeType,
      attributeHash: record.attributeHash,
      disputedAt: record.disputedAt ?? null,
      createdAt: record.createdAt,
    };
  }
}
