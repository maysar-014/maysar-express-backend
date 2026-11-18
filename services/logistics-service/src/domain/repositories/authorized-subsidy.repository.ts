/**
 * AuthorizedSubsidyRepository (MYS-DEL-001 Article 4.5)
 *
 * Fetches active, non-expired subsidy authorizations that may apply to a
 * given delivery quote. The SubsidyGovernanceEngine validates each one
 * before applying it.
 */

import { AuthorizedSubsidy } from '../engines/subsidy-governance.engine';

export interface AuthorizedSubsidyRepository {
  /**
   * Returns all active subsidies applicable to the given zone/strategy
   * combination. The caller picks the first applicable one; if none match
   * it returns an empty array (no subsidy applied).
   */
  findActive(params: {
    deliveryZone?: string | null;
    deliveryStrategy?: string | null;
    asOf: Date;
  }): Promise<AuthorizedSubsidy[]>;
}
