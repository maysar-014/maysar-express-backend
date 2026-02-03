import { Business } from '../../domain/entities/business.entity';
import { BusinessVerificationPolicy } from '../../domain/policies/business-verification.policy';
import { VerifyBusinessDto } from '../dto/business.dto';
import { IBusinessRepository } from '../../domain/repositories';
import {
  BusinessNotFoundError,
  BusinessValidationError,
  UnauthorizedBusinessOperationError
} from '../../domain/errors/business.errors';
import { BusinessVerifiedEvent } from '../../domain/events';
import { SagaEventHandler } from '../sagas/saga-event-handler';

/**
 * Verify Business Use Case
 * Handles business verification workflow
 */
export class VerifyBusinessUseCase {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly sagaEventHandler: SagaEventHandler
  ) {}

  async execute(dto: VerifyBusinessDto): Promise<Business> {
    const business = await this.businessRepository.findById(dto.businessId);
    if (!business) {
      throw new BusinessNotFoundError('Business not found');
    }

    const eligibilityCheck = BusinessVerificationPolicy.canVerify(business);
    if (!eligibilityCheck.allowed) {
      throw new BusinessValidationError(eligibilityCheck.reason ?? 'Verification not allowed');
    }

    const docCheck = BusinessVerificationPolicy.hasRequiredDocuments(
      dto.documentTypes,
      business.businessType
    );
    if (!docCheck.satisfied) {
      throw new BusinessValidationError(`Missing required documents: ${docCheck.missing.join(', ')}`);
    }

    if (!dto.verifiedBy || dto.verifiedBy.trim().length === 0) {
      throw new UnauthorizedBusinessOperationError('Verifier ID is required');
    }

    const verifiedBusiness = business.verify(dto.verifiedBy);
    const updated = await this.businessRepository.update(verifiedBusiness);

    const event = new BusinessVerifiedEvent(updated.id, dto.verifiedBy, updated.ownerId);
    await this.sagaEventHandler.handleBusinessVerifiedEvent(event);

    return updated;
  }
}
