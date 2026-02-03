import { Business } from '../../domain/entities/business.entity';
import { BusinessRegistrationPolicy } from '../../domain/policies/business-registration.policy';
import { SuspendBusinessDto } from '../dto/business.dto';
import { IBusinessRepository } from '../../domain/repositories';
import {
  BusinessNotFoundError,
  BusinessValidationError,
  UnauthorizedBusinessOperationError
} from '../../domain/errors/business.errors';
import { BusinessSuspendedEvent } from '../../domain/events';
import { SagaEventHandler } from '../sagas/saga-event-handler';

/**
 * Suspend Business Use Case
 * Handles business suspension with authorization checks
 */
export class SuspendBusinessUseCase {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly sagaEventHandler: SagaEventHandler
  ) {}

  async execute(dto: SuspendBusinessDto): Promise<Business> {
    const business = await this.businessRepository.findById(dto.businessId);
    if (!business) {
      throw new BusinessNotFoundError('Business not found');
    }

    const policyCheck = BusinessRegistrationPolicy.canSuspend(business, dto.suspendedBy);
    if (!policyCheck.allowed) {
      throw new BusinessValidationError(policyCheck.reason ?? 'Suspension not allowed');
    }

    const suspendedBusiness = business.suspend();
    const updated = await this.businessRepository.update(suspendedBusiness);

    const event = new BusinessSuspendedEvent(updated.id, dto.suspendedBy, dto.reason);
    await this.sagaEventHandler.handleBusinessSuspendedEvent(event);

    return updated;
  }
}
