import { DomainService } from '../interfaces';
import { Business } from '../entities/business.entity';
import { RegistrationNumber } from '../value-objects/registration-number.value-object';
import { TaxId } from '../value-objects/tax-id.value-object';
import { BusinessType } from '../types/business.types';

/**
 * Business Validation Service
 * Handles complex validation logic for business entities
 */
export class BusinessValidationService implements DomainService {
  public readonly name = 'BusinessValidationService';

  /**
   * Validate business for registration
   */
  validateForRegistration(business: Business): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const entityValidation = business.validate();
    if (!entityValidation.isValid) {
      errors.push(...entityValidation.errors);
    }

    if (!business.name || business.name.trim().length < 2) {
      errors.push('Business name must be at least 2 characters');
    }

    if (!this.isValidBusinessType(business.businessType)) {
      errors.push('Invalid business type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate business entity
   */
  validateBusiness(business: Business): void {
    const validation = business.validate();
    if (!validation.isValid) {
      throw new Error(`Business validation failed: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Validate registration number format
   */
  validateRegistrationNumber(value: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!RegistrationNumber.isValid(value)) {
      errors.push('Invalid registration number format. Expected: TZ-{region}-{number}');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate tax ID format
   */
  validateTaxId(value: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!TaxId.isValid(value)) {
      errors.push('Invalid TIN format. Expected 9-digit number');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate business type requirements
   */
  validateBusinessTypeRequirements(
    businessType: BusinessType,
    hasTaxId: boolean,
    hasRegistrationNumber: boolean
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!hasRegistrationNumber) {
      errors.push('Registration number is required for all business types');
    }

    if (businessType === BusinessType.CORPORATION || businessType === BusinessType.LIMITED_LIABILITY) {
      if (!hasTaxId) {
        errors.push('Tax ID is required for corporations and limited liability companies');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidBusinessType(type: BusinessType): boolean {
    return Object.values(BusinessType).includes(type);
  }
}
