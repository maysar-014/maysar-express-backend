import { Business } from '../../domain/entities/business.entity';
import { BusinessRegistrationPolicy } from '../../domain/policies/business-registration.policy';
import { IBusinessRepository } from '../../domain/repositories';
import {
  BusinessNotFoundError,
  BusinessValidationError,
  UnauthorizedBusinessOperationError
} from '../../domain/errors/business.errors';
import { BusinessReactivatedEvent } from '../../domain/events';
import { sagaEventHandler } from '../sagas/saga-event-handler';

/**
 * Reactivate Business Use Case
 * Handles business reactivation from suspended state
 */
export class ReactivateBusinessUseCase {
  constructor(private readonly businessRepository: IBusinessRepository) {}

  async execute(businessId: string, reactivatedBy: string): Promise<Business> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new BusinessNotFoundError('Business not found');
    }

    const policyCheck = BusinessRegistrationPolicy.canReactivate(business);
    if (!policyCheck.allowed) {
      throw new BusinessValidationError(policyCheck.reason ?? 'Reactivation not allowed');
    }

    if (!reactivatedBy || reactivatedBy.trim().length === 0) {
      throw new UnauthorizedBusinessOperationError('Reactivator ID is required');
    }

    const reactivatedBusiness = business.reactivate();
    const updated = await this.businessRepository.update(reactivatedBusiness);

    const event = new BusinessReactivatedEvent(updated.id, reactivatedBy);
    await sagaEventHandler.handleBusinessReactivatedEvent(event);

    return updated;
  }
}
