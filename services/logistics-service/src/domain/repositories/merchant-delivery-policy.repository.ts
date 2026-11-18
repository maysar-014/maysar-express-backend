/**
 * MerchantDeliveryPolicyRepository (MYS-DEL-001 Article 4.4)
 *
 * Fetches the merchant's delivery contribution arrangement.
 * Returns null when no active policy exists for the given merchant —
 * the caller treats null as contributionType=NONE.
 */

import { MerchantContributionPolicy } from '../engines/merchant-contribution.engine';

export interface MerchantDeliveryPolicyRepository {
  findByMerchantId(merchantId: string): Promise<MerchantContributionPolicy | null>;
}
