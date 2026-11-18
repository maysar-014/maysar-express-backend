/**
 * PrismaMerchantDeliveryPolicyRepository
 *
 * Reads merchant delivery contribution policies from
 * logistics_merchant_delivery_policies.
 */

import { MerchantDeliveryPolicyRepository } from '../../domain/repositories/merchant-delivery-policy.repository';
import { MerchantContributionPolicy, MerchantContributionType } from '../../domain/engines/merchant-contribution.engine';

const VALID_TYPES: MerchantContributionType[] = [
  'FLAT_PER_ORDER', 'PERCENTAGE_OF_ORDER', 'PERCENTAGE_OF_FEE', 'CAPPED_PERCENTAGE', 'NONE',
];

export class PrismaMerchantDeliveryPolicyRepository implements MerchantDeliveryPolicyRepository {
  async findByMerchantId(merchantId: string): Promise<MerchantContributionPolicy | null> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.logistics_MerchantDeliveryPolicy?.findFirst) return null;

    try {
      const row = await prisma.logistics_MerchantDeliveryPolicy.findFirst({
        where: { merchantId, isActive: true },
        select: {
          merchantId: true,
          contributionType: true,
          rate: true,
          amountTzs: true,
          agreementRef: true,
        },
      });

      if (!row) return null;

      const type = VALID_TYPES.includes(row.contributionType as MerchantContributionType)
        ? (row.contributionType as MerchantContributionType)
        : 'NONE';

      return {
        merchantId: row.merchantId,
        type,
        rate: row.rate !== null ? Number(row.rate) : undefined,
        amountTzs: row.amountTzs !== null ? Number(row.amountTzs) : undefined,
        agreementRef: row.agreementRef ?? undefined,
      };
    } catch {
      // Non-fatal: treat as no policy
      return null;
    }
  }
}
