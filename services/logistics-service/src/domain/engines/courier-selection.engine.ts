import { CourierAssignmentPolicy, CourierAssignmentCriteria } from '../policies/courier-assignment.policy';
import { CourierEntity } from '../entities/courier.entity';

export interface CourierSelectionResult {
  courier: CourierEntity | null;
  reason: 'no_candidates' | 'single_candidate' | 'policy_selected' | 'no_eligible';
}

/**
 * DOMAIN ENGINE: Courier Selection
 *
 * Pure selection logic that always runs, even in single-courier mode.
 * This keeps the architecture consistent as the fleet scales.
 */
export class CourierSelectionEngine {
  constructor(private readonly policy: CourierAssignmentPolicy) {}

  selectCourier(couriers: CourierEntity[], criteria: CourierAssignmentCriteria): CourierSelectionResult {
    if (!couriers || couriers.length === 0) {
      return { courier: null, reason: 'no_candidates' };
    }

    if (couriers.length === 1) {
      return { courier: couriers[0], reason: 'single_candidate' };
    }

    const selected = this.policy.selectOptimalCourier(couriers, criteria);
    if (!selected) {
      return { courier: null, reason: 'no_eligible' };
    }

    return { courier: selected, reason: 'policy_selected' };
  }
}
