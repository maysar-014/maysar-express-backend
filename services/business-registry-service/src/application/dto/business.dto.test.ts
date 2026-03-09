import { BusinessType } from '../../domain/types/business.types';
import type {
  BusinessAddressDto,
  CreateBusinessDto,
  UpdateBusinessDto,
  BusinessResponseDto,
  VerifyBusinessDto,
  SuspendBusinessDto
} from './business.dto';

describe('business.dto type contracts', () => {
  it('supports create/update/response dto shapes', () => {
    const address: BusinessAddressDto = {
      id: 'addr-1',
      type: 'MAIN',
      street: 'Samora Ave',
      city: 'Dar es Salaam',
      region: 'DSM',
      postalCode: 'DAR001',
      country: 'Tanzania',
      isPrimary: true
    };

    const createDto: CreateBusinessDto = {
      name: 'Acme Ltd',
      businessType: BusinessType.CORPORATION,
      registrationNumber: 'REG-100',
      ownerId: 'owner-1',
      addresses: [address]
    };

    const updateDto: UpdateBusinessDto = {
      name: 'Acme Updated',
      addresses: [address]
    };

    const responseDto: BusinessResponseDto = {
      id: 'biz-1',
      name: 'Acme Ltd',
      businessType: BusinessType.CORPORATION,
      registrationNumber: 'REG-100',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      complianceStatus: 'COMPLIANT',
      ownerId: 'owner-1',
      addresses: [address],
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-08T00:00:00.000Z')
    };

    expect(createDto.addresses?.[0].city).toBe('Dar es Salaam');
    expect(updateDto.name).toBe('Acme Updated');
    expect(responseDto.status).toBe('ACTIVE');
  });

  it('supports verify and suspend dto shapes', () => {
    const verifyDto: VerifyBusinessDto = {
      businessId: 'biz-2',
      verifiedBy: 'admin-1',
      documentTypes: ['id_card', 'license']
    };

    const suspendDto: SuspendBusinessDto = {
      businessId: 'biz-2',
      suspendedBy: 'admin-2',
      reason: 'policy violation'
    };

    expect(verifyDto.documentTypes).toHaveLength(2);
    expect(suspendDto.reason).toBe('policy violation');
  });
});
