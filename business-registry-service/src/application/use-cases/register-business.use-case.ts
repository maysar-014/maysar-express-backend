import { Business } from '../../domain/entities/business.entity';
import { RegistrationNumber } from '../../domain/value-objects/registration-number.value-object';
import { BusinessValidationService } from '../../domain/services/business-validation.service';
import { BusinessRegistrationPolicy } from '../../domain/policies/business-registration.policy';
import { CreateBusinessDto } from '../dto/business.dto';
import { BusinessMapper } from '../mappers/business-mapper';
import { IBusinessRepository } from '../../domain/repositories';
import {
  BusinessAlreadyExistsError,
  BusinessValidationError,
  InvalidRegistrationNumberError
} from '../../domain/errors/business.errors';
import { BusinessRegisteredEvent } from '../../domain/events';
import { sagaEventHandler } from '../sagas/saga-event-handler';

/**
 * Register Business Use Case
 * Handles business registration with validation and policy checks
 */
export class RegisterBusinessUseCase {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly businessValidationService: BusinessValidationService
  ) {}

  async execute(dto: CreateBusinessDto): Promise<Business> {
    this.validateInput(dto);

    const existingByReg = await this.businessRepository.findByRegistrationNumber(dto.registrationNumber);
    if (existingByReg) {
      throw new BusinessAlreadyExistsError('Business with this registration number already exists');
    }

    if (dto.taxId) {
      const existingByTax = await this.businessRepository.findByTaxId(dto.taxId);
      if (existingByTax) {
        throw new BusinessAlreadyExistsError('Business with this tax ID already exists');
      }
    }

    const ownerBusinessCount = (await this.businessRepository.findByOwnerId(dto.ownerId)).length;
    const policyCheck = BusinessRegistrationPolicy.canRegister(dto.ownerId, ownerBusinessCount);
    if (!policyCheck.allowed) {
      throw new BusinessValidationError(policyCheck.reason ?? 'Registration not allowed');
    }

    const business = BusinessMapper.toEntity(dto);
    this.businessValidationService.validateBusiness(business);

    const created = await this.businessRepository.create(business);

    const event = new BusinessRegisteredEvent(
      created.id,
      created.ownerId,
      created.businessType,
      created.registrationNumber.getValue()
    );
    await sagaEventHandler.handleBusinessRegisteredEvent(event);

    return created;
  }

  private validateInput(dto: CreateBusinessDto): void {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new BusinessValidationError('Business name must be at least 2 characters');
    }
    if (!dto.ownerId || dto.ownerId.trim().length === 0) {
      throw new BusinessValidationError('Owner ID is required');
    }
    try {
      RegistrationNumber.create(dto.registrationNumber);
    } catch {
      throw new InvalidRegistrationNumberError('Invalid registration number format');
    }
  }
}
