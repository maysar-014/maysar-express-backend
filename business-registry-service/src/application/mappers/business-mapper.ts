import { Business } from '../../domain/entities/business.entity';
import { BusinessId } from '../../domain/value-objects/business-id.value-object';
import { RegistrationNumber } from '../../domain/value-objects/registration-number.value-object';
import { TaxId } from '../../domain/value-objects/tax-id.value-object';
import { BusinessAddress } from '../../domain/value-objects/business-address.value-object';
import {
  CreateBusinessDto,
  UpdateBusinessDto,
  BusinessResponseDto,
  BusinessAddressDto
} from '../dto/business.dto';
import { BusinessType, BusinessStatus, VerificationStatus, ComplianceStatus } from '../../domain/types/business.types';

/**
 * Business Mapper - Converts between domain entities and DTOs
 */
export class BusinessMapper {
  /**
   * Map CreateBusinessDto to Business entity
   */
  static toEntity(dto: CreateBusinessDto, id?: string): Business {
    const businessId = id || BusinessId.create().getValue();
    const registrationNumber = RegistrationNumber.create(dto.registrationNumber);
    const taxId = dto.taxId ? TaxId.create(dto.taxId) : undefined;
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

    return Business.register({
      id: businessId,
      name: dto.name,
      businessType: dto.businessType,
      registrationNumber,
      taxId,
      ownerId: dto.ownerId,
      description: dto.description,
      industry: dto.industry,
      website: dto.website,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      addresses
    });
  }

  /**
   * Map Business entity to BusinessResponseDto
   */
  static toResponseDto(business: Business): BusinessResponseDto {
    return {
      id: business.id,
      name: business.name,
      businessType: business.businessType,
      registrationNumber: business.registrationNumber.getValue(),
      taxId: business.taxId?.getValue(),
      status: business.status,
      verificationStatus: business.verificationStatus,
      complianceStatus: business.complianceStatus,
      ownerId: business.ownerId,
      description: business.description,
      industry: business.industry,
      website: business.website,
      email: business.email,
      phoneNumber: business.phoneNumber,
      verifiedAt: business.verifiedAt,
      verifiedBy: business.verifiedBy,
      addresses: business.addresses.map(addr => ({
        id: addr.getId(),
        type: addr.getType() as 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OTHER',
        street: addr.getStreet(),
        city: addr.getCity(),
        region: addr.getRegion(),
        postalCode: addr.getPostalCode(),
        country: addr.getCountry(),
        isPrimary: addr.isPrimary
      })),
      createdAt: business.createdAt,
      updatedAt: business.updatedAt
    };
  }

  /**
   * Map Business entity to persistence model (for Prisma)
   */
  static toPersistence(business: Business): Record<string, unknown> {
    return {
      id: business.id,
      name: business.name,
      businessType: business.businessType,
      registrationNumber: business.registrationNumber.getValue(),
      taxId: business.taxId?.getValue(),
      status: business.status,
      verificationStatus: business.verificationStatus,
      complianceStatus: business.complianceStatus,
      ownerId: business.ownerId,
      description: business.description,
      industry: business.industry,
      website: business.website,
      email: business.email,
      phoneNumber: business.phoneNumber,
      verifiedAt: business.verifiedAt,
      verifiedBy: business.verifiedBy,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt
    };
  }
}
