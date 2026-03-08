// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { IBuyBoxRepository } from '../../domain/repositories/repository.interfaces';
import { BuyBoxResult } from '../../domain/value-objects/buy-box-result.value-object';

export class PrismaBuyBoxRepository implements IBuyBoxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(result: BuyBoxResult): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.buyBox.findUnique({
        where: { productId: result.productId }
      });

      if (existing) {
        await tx.catalog_BuyBoxAlternative.deleteMany({
          where: { buyBoxId: existing.id }
        });
        await tx.buyBox.update({
          where: { id: existing.id },
          data: {
            primarySellerId: result.primarySellerId,
            primaryScore: result.primaryScore,
            lastComputedAt: result.computedAt,
            alternatives: {
              create: result.alternatives.map(alt => ({
                sellerId: alt.sellerId,
                score: alt.score,
                rank: alt.rank
              }))
            }
          }
        });
      } else {
        await tx.buyBox.create({
          data: {
            productId: result.productId,
            primarySellerId: result.primarySellerId,
            primaryScore: result.primaryScore,
            lastComputedAt: result.computedAt,
            alternatives: {
              create: result.alternatives.map(alt => ({
                sellerId: alt.sellerId,
                score: alt.score,
                rank: alt.rank
              }))
            }
          }
        });
      }
    });
  }

  async findByProductId(productId: string): Promise<BuyBoxResult | null> {
    const buyBox = await this.prisma.buyBox.findUnique({
      where: { productId },
      include: {
        alternatives: {
          orderBy: { rank: 'asc' }
        }
      }
    });

    if (!buyBox) return null;

    return new BuyBoxResult(
      buyBox.productId,
      buyBox.primarySellerId,
      buyBox.primaryScore.toNumber(),
      buyBox.alternatives.map(alt => ({
        sellerId: alt.sellerId,
        score: alt.score.toNumber(),
        rank: alt.rank
      })),
      buyBox.lastComputedAt
    );
  }

  async deleteByProductId(productId: string): Promise<void> {
    await this.prisma.buyBox.deleteMany({
      where: { productId }
    });
  }
}
