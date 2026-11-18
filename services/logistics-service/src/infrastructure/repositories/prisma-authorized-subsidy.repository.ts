/**
 * PrismaAuthorizedSubsidyRepository
 *
 * Reads active delivery subsidy authorizations from
 * logistics_authorized_subsidies.
 *
 * Matching logic:
 *   1. Active and not expired as of `asOf`.
 *   2. applicableZone is null (global) OR matches the requested zone.
 *   3. applicableStrategy is null (global) OR matches the requested strategy.
 */

import { AuthorizedSubsidyRepository } from '../../domain/repositories/authorized-subsidy.repository';
import { AuthorizedSubsidy, SubsidyFundingSource, SubsidyPurpose } from '../../domain/engines/subsidy-governance.engine';

const VALID_SOURCES: SubsidyFundingSource[] = ['MAYSAR_PLATFORM', 'MERCHANT_PROMOTION', 'COMMERCIAL_PARTNER', 'CAMPAIGN'];
const VALID_PURPOSES: SubsidyPurpose[] = ['FREE_DELIVERY_PROMOTION', 'DISCOUNTED_DELIVERY', 'COVERAGE_OF_DEFICIT', 'DRIVER_MINIMUM_TOP_UP', 'NEW_ZONE_LAUNCH'];

export class PrismaAuthorizedSubsidyRepository implements AuthorizedSubsidyRepository {
  async findActive(params: {
    deliveryZone?: string | null;
    deliveryStrategy?: string | null;
    asOf: Date;
  }): Promise<AuthorizedSubsidy[]> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.logistics_AuthorizedSubsidy?.findMany) return [];

    try {
      const rows = await prisma.logistics_AuthorizedSubsidy.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: params.asOf } },
          ],
          AND: [
            {
              OR: [
                { applicableZone: null },
                { applicableZone: params.deliveryZone ?? null },
              ],
            },
            {
              OR: [
                { applicableStrategy: null },
                { applicableStrategy: params.deliveryStrategy ?? null },
              ],
            },
          ],
        },
        orderBy: { authorizedAt: 'desc' },
        take: 5, // at most 5 candidates; first valid one wins
      });

      return rows
        .filter((row: any) =>
          VALID_SOURCES.includes(row.fundingSource) &&
          VALID_PURPOSES.includes(row.purpose),
        )
        .map((row: any): AuthorizedSubsidy => ({
          authorizationId: row.id,
          fundingSource: row.fundingSource as SubsidyFundingSource,
          purpose: row.purpose as SubsidyPurpose,
          authorizedAmountTzs: Number(row.authorizedAmountTzs),
          authorizedBy: row.authorizedBy,
          authorizedAt: new Date(row.authorizedAt),
          expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
          sourceRef: row.sourceRef ?? undefined,
        }));
    } catch {
      return [];
    }
  }
}
