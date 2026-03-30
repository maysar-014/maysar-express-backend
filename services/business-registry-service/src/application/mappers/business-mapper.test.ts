import { BusinessMapper } from './business-mapper';
import { Business } from '../../domain/entities/business.entity';
import { RegistrationNumber } from '../../domain/value-objects/registration-number.value-object';
import { TaxId } from '../../domain/value-objects/tax-id.value-object';
import { BusinessAddress } from '../../domain/value-objects/business-address.value-object';
import {
  BusinessType,
  BusinessStatus,
  VerificationStatus,
  ComplianceStatus
} from '../../domain/types/business.types';

describe('BusinessMapper', () => {
  it('maps create DTO to entity with value objects', () => {
    const entity = BusinessMapper.toEntity(
      {
        name: 'Acme',
        businessType: BusinessType.CORPORATION,
        registrationNumber: 'TZ-DAR-12345',
        taxId: '123456789',
        ownerId: 'owner-1',
        industry: ['retail', 'wholesale'],
        addresses: [
          {
            id: 'addr-1',
            type: 'MAIN',
            street: 'Samora Ave',
            city: 'Dar',
            region: 'Dar es Salaam',
            postalCode: '11101',
            country: 'Tanzania',
            isPrimary: true
          }
        ]
      },
      'biz-1'
    );

    expect(entity.id).toBe('biz-1');
    expect(entity.registrationNumber.getValue()).toBe('TZ-DAR-12345');
    expect(entity.taxId?.getValue()).toBe('123456789');
    expect(entity.addresses[0]?.getId()).toBe('addr-1');
    expect(entity.ownerId).toBe('owner-1');
  });

  it('maps domain entity to response DTO and persistence model', () => {
    const business = new Business({
      id: 'biz-2',
      name: 'Mapper Test Ltd',
      businessType: BusinessType.LIMITED_LIABILITY,
      registrationNumber: RegistrationNumber.create('TZ-AR-54321'),
      taxId: TaxId.create('987654321'),
      status: BusinessStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      complianceStatus: ComplianceStatus.COMPLIANT,
      ownerId: 'owner-2',
      description: 'desc',
      industry: ['Retail', 'Wholesale'],
      website: 'https://mapper.test',
      email: 'hello@mapper.test',
      phoneNumber: '255700000002',
      verifiedAt: new Date('2026-02-01T00:00:00.000Z'),
      verifiedBy: 'admin',
      addresses: [
        BusinessAddress.create({
          id: 'addr-2',
          type: 'MAIN',
          street: 'Uhuru St',
          city: 'Dar',
          region: 'Dar es Salaam',
          postalCode: '11102',
          country: 'Tanzania',
          isPrimary: true
        })
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z')
    });

    const dto = BusinessMapper.toResponseDto(business);
    const persistence = BusinessMapper.toPersistence(business);

    expect(dto).toEqual(
      expect.objectContaining({
        id: 'biz-2',
        registrationNumber: 'TZ-AR-54321',
        taxId: '987654321',
        ownerId: 'owner-2',
        industry: ['retail', 'wholesale']
      })
    );
    expect(dto.addresses).toHaveLength(1);
    expect(persistence).toEqual(
      expect.objectContaining({
        id: 'biz-2',
        registrationNumber: 'TZ-AR-54321',
        verificationStatus: VerificationStatus.VERIFIED,
        complianceStatus: ComplianceStatus.COMPLIANT
      })
    );
  });
});
