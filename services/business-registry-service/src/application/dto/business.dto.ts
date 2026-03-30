import { BusinessType } from '../../domain/types/business.types';

export interface BusinessAddressDto {
  id?: string;
  type: 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OTHER';
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
  isPrimary: boolean;
}

/**
 * Create Business DTO
 */
export interface CreateBusinessDto {
  name: string;
  businessType: BusinessType;
  registrationNumber: string;
  taxId?: string;
  ownerId: string;
  description?: string;
  industry: string[];
  website?: string;
  email?: string;
  phoneNumber?: string;
  addresses?: BusinessAddressDto[];
}

/**
 * Update Business DTO
 */
export interface UpdateBusinessDto {
  name?: string;
  description?: string;
  industry?: string[];
  website?: string;
  email?: string;
  phoneNumber?: string;
  addresses?: BusinessAddressDto[];
}

/**
 * Business Response DTO
 */
export interface BusinessResponseDto {
  id: string;
  name: string;
  businessType: BusinessType;
  registrationNumber: string;
  taxId?: string;
  status: string;
  verificationStatus: string;
  complianceStatus: string;
  ownerId: string;
  description?: string;
  industry: string[];
  website?: string;
  email?: string;
  phoneNumber?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  addresses?: BusinessAddressDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Verify Business DTO
 */
export interface VerifyBusinessDto {
  businessId: string;
  verifiedBy: string;
  documentTypes: string[];
}

/**
 * Suspend Business DTO
 */
export interface SuspendBusinessDto {
  businessId: string;
  suspendedBy: string;
  reason?: string;
}
