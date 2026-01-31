import { Business } from '../../domain/entities/business.entity';
import { BusinessAddress } from '../../domain/value-objects/business-address.value-object';
import { BusinessRegistrationPolicy } from '../../domain/policies/business-registration.policy';
import { UpdateBusinessDto } from '../dto/business.dto';
import { IBusinessRepository } from '../../domain/repositories';
import {
  BusinessNotFoundError,
  BusinessValidationError,
  UnauthorizedBusinessOperationError
} from '../../domain/errors/business.errors';
import { BusinessUpdatedEvent } from '../../domain/events';
import { SagaEventHandler } from '../sagas/saga-event-handler';

/**
 * Update Business Use Case
 * Handles business detail updates with permission checks
 */
export class UpdateBusinessUseCase {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly sagaEventHandler: SagaEventHandler
  ) {}

  async execute(businessId: string, dto: UpdateBusinessDto, updatedBy: string): Promise<Business> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new BusinessNotFoundError('Business not found');
    }

    const policyCheck = BusinessRegistrationPolicy.canUpdateDetails(business, updatedBy);
    if (!policyCheck.allowed) {
      throw new UnauthorizedBusinessOperationError(policyCheck.reason ?? 'Update not allowed');
    }

    const addresses = dto.addresses?.map((addr, idx) =>
      BusinessAddress.create({
        id: addr.id || `addr-${Date.now()}-${idx}`,
        type: addr.type,
        street: addr.street,
        city: addr.city,
        region: addr.region,
        postalCode: addr.postalCode,
        country: addr.country || 'Tanzania',
        isPrimary: addr.isPrimary ?? false
      })
    );

    const updatedBusiness = business.updateDetails({
      name: dto.name,
      description: dto.description,
      industry: dto.industry,
      website: dto.website,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      addresses
    });

    const updated = await this.businessRepository.update(updatedBusiness);

    const changes = this.getChangedFields(dto);
    const event = new BusinessUpdatedEvent(updated.id, updatedBy, changes);
    await this.sagaEventHandler.handleBusinessUpdatedEvent(event);

    return updated;
  }

  private getChangedFields(dto: UpdateBusinessDto): string[] {
    const changes: string[] = [];
    if (dto.name !== undefined) changes.push('name');
    if (dto.description !== undefined) changes.push('description');
    if (dto.industry !== undefined) changes.push('industry');
    if (dto.website !== undefined) changes.push('website');
    if (dto.email !== undefined) changes.push('email');
    if (dto.phoneNumber !== undefined) changes.push('phoneNumber');
    if (dto.addresses !== undefined) changes.push('addresses');
    return changes;
  }
}
