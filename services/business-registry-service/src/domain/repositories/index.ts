import { Business } from '../entities/business.entity';
import { BusinessStatus, VerificationStatus } from '../types/business.types';

export interface PublicBusinessDiscoveryFilters {
  sellerId?: string;
  sellerIds?: string[];
  industry?: string;
  industries?: string[];
  query?: string;
  limit?: number;
  offset?: number;
}

/**
 * Business Repository Interface
 * Defines the contract for business data access operations
 */
export interface IBusinessRepository {
  findById(id: string): Promise<Business | null>;
  findByRegistrationNumber(registrationNumber: string): Promise<Business | null>;
  findByTaxId(taxId: string): Promise<Business | null>;
  findByOwnerId(ownerId: string): Promise<Business[]>;
  findPublicSellerPreviews(filters?: Omit<PublicBusinessDiscoveryFilters, 'sellerId' | 'sellerIds'>): Promise<Business[]>;
  findPublicBusinesses(filters?: PublicBusinessDiscoveryFilters): Promise<Business[]>;
  create(business: Business): Promise<Business>;
  update(business: Business): Promise<Business>;
  delete(id: string): Promise<void>;
  search(query: string, limit?: number, offset?: number): Promise<Business[]>;
  findAll(limit?: number, offset?: number): Promise<Business[]>;
  count(): Promise<number>;
  findByStatus(status: BusinessStatus): Promise<Business[]>;
  findByVerificationStatus(status: VerificationStatus): Promise<Business[]>;
  updateStatus(id: string, status: BusinessStatus): Promise<void>;
  updateVerificationStatus(id: string, status: VerificationStatus, verifiedBy?: string): Promise<void>;
  getBusinessStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byVerificationStatus: Record<string, number>;
  }>;
  bulkUpdateStatus(ids: string[], status: BusinessStatus): Promise<{ successCount: number; failures: Array<{ id: string; error: string }> }>;
}
