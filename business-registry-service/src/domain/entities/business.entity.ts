import { Entity } from '../interfaces';
import { BusinessId } from '../value-objects/business-id.value-object';
import { RegistrationNumber } from '../value-objects/registration-number.value-object';
import { TaxId } from '../value-objects/tax-id.value-object';
import { BusinessAddress } from '../value-objects/business-address.value-object';
import {
  BusinessType,
  BusinessStatus,
  VerificationStatus,
  ComplianceStatus
} from '../types/business.types';

export {
  BusinessType,
  BusinessStatus,
  VerificationStatus,
  ComplianceStatus
} from '../types/business.types';

export interface BusinessProps {
  id: string;
  name: string;
  businessType: BusinessType;
  registrationNumber: RegistrationNumber;
  taxId?: TaxId;
  status: BusinessStatus;
  verificationStatus: VerificationStatus;
  complianceStatus: ComplianceStatus;
  ownerId: string;
  description?: string;
  industry?: string;
  website?: string;
  email?: string;
  phoneNumber?: string;
  verifiedAt?: Date;
  verifiedBy?: string;
  addresses?: BusinessAddress[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Business Entity
 * Represents a business in the Maysar marketplace system
 */
export class Business implements Entity {
  public readonly id: string;
  public readonly name: string;
  public readonly businessType: BusinessType;
  public readonly registrationNumber: RegistrationNumber;
  public readonly taxId?: TaxId;
  public readonly status: BusinessStatus;
  public readonly verificationStatus: VerificationStatus;
  public readonly complianceStatus: ComplianceStatus;
  public readonly ownerId: string;
  public readonly description?: string;
  public readonly industry?: string;
  public readonly website?: string;
  public readonly email?: string;
  public readonly phoneNumber?: string;
  public readonly verifiedAt?: Date;
  public readonly verifiedBy?: string;
  public readonly addresses: BusinessAddress[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: BusinessProps) {
    this.id = props.id;
    this.name = props.name;
    this.businessType = props.businessType;
    this.registrationNumber = props.registrationNumber;
    this.taxId = props.taxId;
    this.status = props.status;
    this.verificationStatus = props.verificationStatus;
    this.complianceStatus = props.complianceStatus;
    this.ownerId = props.ownerId;
    this.description = props.description;
    this.industry = props.industry;
    this.website = props.website;
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.verifiedAt = props.verifiedAt;
    this.verifiedBy = props.verifiedBy;
    this.addresses = props.addresses ?? [];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new business (register)
   */
  static register(props: {
    id: string;
    name: string;
    businessType: BusinessType;
    registrationNumber: RegistrationNumber;
    taxId?: TaxId;
    ownerId: string;
    description?: string;
    industry?: string;
    website?: string;
    email?: string;
    phoneNumber?: string;
    addresses?: BusinessAddress[];
  }): Business {
    return new Business({
      ...props,
      status: BusinessStatus.PENDING,
      verificationStatus: VerificationStatus.UNVERIFIED,
      complianceStatus: ComplianceStatus.UNDER_REVIEW,
      addresses: props.addresses ?? [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Verify the business
   */
  verify(verifiedBy: string): Business {
    return new Business({
      ...this,
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      verifiedBy,
      status: this.status === BusinessStatus.PENDING ? BusinessStatus.ACTIVE : this.status,
      updatedAt: new Date()
    });
  }

  /**
   * Suspend the business
   */
  suspend(): Business {
    return new Business({
      ...this,
      status: BusinessStatus.SUSPENDED,
      updatedAt: new Date()
    });
  }

  /**
   * Reactivate the business
   */
  reactivate(): Business {
    return new Business({
      ...this,
      status: BusinessStatus.ACTIVE,
      updatedAt: new Date()
    });
  }

  /**
   * Update business details
   */
  updateDetails(props: {
    name?: string;
    description?: string;
    industry?: string;
    website?: string;
    email?: string;
    phoneNumber?: string;
    addresses?: BusinessAddress[];
  }): Business {
    return new Business({
      ...this,
      ...props,
      updatedAt: new Date()
    });
  }

  /**
   * Validate business entity
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id || this.id.trim().length === 0) {
      errors.push('Business ID is required');
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Business name is required');
    }

    if (!this.registrationNumber || !this.registrationNumber.isValid()) {
      errors.push('Valid registration number is required');
    }

    if (!this.ownerId || this.ownerId.trim().length === 0) {
      errors.push('Owner ID is required');
    }

    if (this.taxId && !this.taxId.isValid()) {
      errors.push('Invalid tax ID format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isActive(): boolean {
    return this.status === BusinessStatus.ACTIVE;
  }

  isVerified(): boolean {
    return this.verificationStatus === VerificationStatus.VERIFIED;
  }

  isSuspended(): boolean {
    return this.status === BusinessStatus.SUSPENDED;
  }

  canOperate(): boolean {
    return this.isActive() && this.isVerified() && this.complianceStatus !== ComplianceStatus.NON_COMPLIANT;
  }
}
