import { BusinessValidationService } from './business-validation.service';
import { Business } from '../entities/business.entity';
import { RegistrationNumber } from '../value-objects/registration-number.value-object';
import { TaxId } from '../value-objects/tax-id.value-object';
import { BusinessType } from '../types/business.types';

const createBusiness = (overrides: Partial<Parameters<typeof Business.register>[0]> = {}): Business =>
  Business.register({
    id: 'biz-1',
    name: 'Acme',
    businessType: BusinessType.CORPORATION,
    registrationNumber: RegistrationNumber.create('TZ-DAR-12345'),
    taxId: TaxId.create('123456789'),
    ownerId: 'owner-1',
    ...overrides
  });

describe('BusinessValidationService', () => {
  it('validates a complete registration payload', () => {
    const service = new BusinessValidationService();
    const business = createBusiness();

    const result = service.validateForRegistration(business);

    expect(service.name).toBe('BusinessValidationService');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports invalid registration details and business type', () => {
    const service = new BusinessValidationService();
    const business = createBusiness({ name: 'A', businessType: 'INVALID' as unknown as BusinessType });

    const result = service.validateForRegistration(business);

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Business name must be at least 2 characters',
        'Invalid business type'
      ])
    );
  });

  it('throws when business entity validation fails', () => {
    const service = new BusinessValidationService();
    const broken = createBusiness({ ownerId: '' });

    expect(() => service.validateBusiness(broken)).toThrow('Business validation failed');
  });

  it('validates registration number and tax id formats', () => {
    const service = new BusinessValidationService();

    expect(service.validateRegistrationNumber('TZ-AR-12345')).toEqual({ isValid: true, errors: [] });
    expect(service.validateRegistrationNumber('AR-12345').isValid).toBe(false);

    expect(service.validateTaxId('123456789')).toEqual({ isValid: true, errors: [] });
    expect(service.validateTaxId('12-34').isValid).toBe(false);
  });

  it('enforces business-type specific document requirements', () => {
    const service = new BusinessValidationService();

    const corporation = service.validateBusinessTypeRequirements(BusinessType.CORPORATION, false, true);
    expect(corporation.isValid).toBe(false);
    expect(corporation.errors).toContain('Tax ID is required for corporations and limited liability companies');

    const sole = service.validateBusinessTypeRequirements(BusinessType.SOLE_PROPRIETORSHIP, false, false);
    expect(sole.isValid).toBe(false);
    expect(sole.errors).toContain('Registration number is required for all business types');
  });
});
