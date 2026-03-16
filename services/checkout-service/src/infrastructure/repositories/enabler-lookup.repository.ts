import { PrismaClient } from '@prisma/client';
import { EnablerLookup } from '../../application/use-cases/initiate-checkout.use-case';

export class PrismaEnablerLookupRepository implements EnablerLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCode(code: string, shortCode?: string): Promise<{ id: string; userId: string; status: string } | null> {
    const data = await this.prisma.enabler_Profile.findFirst({
      where: {
        OR: [
          { enablerCode: code },
          ...(shortCode ? [{ enablerCodeShort: shortCode }] : [])
        ]
      },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });

    if (!data) return null;

    return {
      id: data.id,
      userId: data.userId,
      status: String(data.status)
    };
  }
}
