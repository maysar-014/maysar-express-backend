import { Prisma, PrismaClient } from '@prisma/client';
import { IBusinessRepository } from '../../domain/repositories';
import { Business } from '../../domain/entities/business.entity';
import { BusinessId } from '../../domain/value-objects/business-id.value-object';
import { RegistrationNumber } from '../../domain/value-objects/registration-number.value-object';
import { TaxId } from '../../domain/value-objects/tax-id.value-object';
import { BusinessAddress } from '../../domain/value-objects/business-address.value-object';
import { BusinessStatus, ComplianceStatus, VerificationStatus } from '../../domain/types/business.types';
import { BusinessNotFoundError } from '../../domain/errors/business.errors';
import { logger } from '../services/logger.service';
import { PublicBusinessDiscoveryFilters } from '../../domain/repositories';

export class PrismaBusinessRepository implements IBusinessRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Business | null> {
    try {
      const data = await this.prisma.business.findUnique({
        where: { id },
        include: { addresses: true }
      });
      return data ? this.mapToDomain(data) : null;
    } catch (error) {
      logger.error('Error finding business by ID', { businessId: id, error: this.formatError(error) });
      throw error;
    }
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Business | null> {
    try {
      const data = await this.prisma.business.findUnique({
        where: { registrationNumber },
        include: { addresses: true }
      });
      return data ? this.mapToDomain(data) : null;
    } catch (error) {
      logger.error('Error finding business by registration number', { registrationNumber, error: this.formatError(error) });
      throw error;
    }
  }

  async findByTaxId(taxId: string): Promise<Business | null> {
    try {
      const data = await this.prisma.business.findFirst({
        where: { taxId },
        include: { addresses: true }
      });
      return data ? this.mapToDomain(data) : null;
    } catch (error) {
      logger.error('Error finding business by tax ID', { taxId, error: this.formatError(error) });
      throw error;
    }
  }

  async findByOwnerId(ownerId: string): Promise<Business[]> {
    try {
      const data = await this.prisma.business.findMany({
        where: { ownerId },
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error finding businesses by owner', { ownerId, error: this.formatError(error) });
      throw error;
    }
  }

  async findPublicSellerPreviews(filters: Omit<PublicBusinessDiscoveryFilters, 'sellerId' | 'sellerIds'> = {}): Promise<Business[]> {
    try {
      const where = this.buildPublicDiscoveryWhere(filters);
      const data = await this.prisma.business.findMany({
        where,
        distinct: ['ownerId'],
        take: this.normalizeLimit(filters.limit),
        skip: this.normalizeOffset(filters.offset),
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error finding public seller previews', { filters, error: this.formatError(error) });
      throw error;
    }
  }

  async findPublicBusinesses(filters: PublicBusinessDiscoveryFilters = {}): Promise<Business[]> {
    try {
      const where = this.buildPublicDiscoveryWhere(filters);
      const data = await this.prisma.business.findMany({
        where,
        ...(typeof filters.limit === 'number' ? { take: filters.limit } : {}),
        ...(typeof filters.offset === 'number' ? { skip: filters.offset } : {}),
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error finding public businesses', { filters, error: this.formatError(error) });
      throw error;
    }
  }

  async create(business: Business): Promise<Business> {
    try {
      const data = await this.prisma.business.create({
        data: {
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
          addresses: business.addresses.length
            ? {
                create: business.addresses.map(addr => ({
                  id: addr.getId(),
                  type: addr.getType() as 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OTHER',
                  street: addr.getStreet(),
                  city: addr.getCity(),
                  region: addr.getRegion(),
                  postalCode: addr.getPostalCode(),
                  country: addr.getCountry(),
                  isPrimary: addr.isPrimary
                }))
              }
            : undefined
        },
        include: { addresses: true }
      });
      return this.mapToDomain(data);
    } catch (error) {
      logger.error('Error creating business', { businessId: business.id, error: this.formatError(error) });
      throw error;
    }
  }

  async update(business: Business): Promise<Business> {
    try {
      const data = await this.prisma.$transaction(async (tx) => {
        await tx.business.update({
          where: { id: business.id },
          data: {
            name: business.name,
            status: business.status,
            verificationStatus: business.verificationStatus,
            complianceStatus: business.complianceStatus,
            description: business.description,
            industry: business.industry,
            website: business.website,
            email: business.email,
            phoneNumber: business.phoneNumber,
            verifiedAt: business.verifiedAt,
            verifiedBy: business.verifiedBy,
            updatedAt: new Date()
          }
        });

        const existingAddresses = await tx.businessAddress.findMany({
          where: { businessId: business.id },
          select: { id: true }
        });
        const existingIds = new Set<string>(existingAddresses.map((a) => a.id));
        const providedIds = new Set<string>(business.addresses.map((a) => a.getId()));

        const toDelete = Array.from(existingIds).filter((id) => !providedIds.has(id));
        if (toDelete.length > 0) {
          await tx.businessAddress.deleteMany({
            where: { id: { in: toDelete }, businessId: business.id }
          });
        }

        for (const addr of business.addresses) {
          const addrId = addr.getId();
          const addrData = {
            type: addr.getType() as 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OTHER',
            street: addr.getStreet(),
            city: addr.getCity(),
            region: addr.getRegion(),
            postalCode: addr.getPostalCode() ?? null,
            country: addr.getCountry(),
            isPrimary: addr.isPrimary
          };

          if (existingIds.has(addrId)) {
            await tx.businessAddress.update({
              where: { id: addrId },
              data: addrData
            });
          } else {
            await tx.businessAddress.create({
              data: {
                id: addrId,
                businessId: business.id,
                ...addrData
              }
            });
          }
        }

        return tx.business.findUnique({
          where: { id: business.id },
          include: { addresses: true }
        });
      });

      if (!data) {
        throw new BusinessNotFoundError(`Business ${business.id} not found`);
      }
      return this.mapToDomain(data);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new BusinessNotFoundError('Business not found');
      }
      logger.error('Error updating business', { businessId: business.id, error: this.formatError(error) });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.business.delete({ where: { id } });
      logger.info('Business deleted successfully', { businessId: id });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new BusinessNotFoundError('Business not found');
      }
      logger.error('Error deleting business', { businessId: id, error: this.formatError(error) });
      throw error;
    }
  }

  async search(query: string, limit = 50, offset = 0): Promise<Business[]> {
    try {
      const normalizedQuery = query.trim().toLowerCase();
      const searchTerms = normalizedQuery.length > 0 ? normalizedQuery.split(/[\s,]+/).filter(Boolean) : [];
      const data = await this.prisma.business.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { registrationNumber: { contains: query, mode: 'insensitive' } },
            ...(searchTerms.length > 0 ? [{ industry: { hasSome: searchTerms } }] : [])
          ]
        },
        take: limit,
        skip: offset,
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error searching businesses', { query, error: this.formatError(error) });
      throw error;
    }
  }

  async findAll(limit = 100, offset = 0): Promise<Business[]> {
    try {
      const data = await this.prisma.business.findMany({
        take: limit,
        skip: offset,
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error finding all businesses', { error: this.formatError(error) });
      throw error;
    }
  }

  async count(): Promise<number> {
    try {
      return await this.prisma.business.count();
    } catch (error) {
      logger.error('Error counting businesses', { error: this.formatError(error) });
      throw error;
    }
  }

  async findByStatus(status: BusinessStatus): Promise<Business[]> {
    try {
      const data = await this.prisma.business.findMany({
        where: { status: status as never },
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error finding businesses by status', { status, error: this.formatError(error) });
      throw error;
    }
  }

  async findByVerificationStatus(status: VerificationStatus): Promise<Business[]> {
    try {
      const data = await this.prisma.business.findMany({
        where: { verificationStatus: status as never },
        include: { addresses: true },
        orderBy: { createdAt: 'desc' }
      });
      return data.map(d => this.mapToDomain(d));
    } catch (error) {
      logger.error('Error finding businesses by verification status', { status, error: this.formatError(error) });
      throw error;
    }
  }

  async updateStatus(id: string, status: BusinessStatus): Promise<void> {
    try {
      await this.prisma.business.update({
        where: { id },
        data: { status: status as never }
      });
      logger.info('Business status updated', { businessId: id, status });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new BusinessNotFoundError('Business not found');
      }
      logger.error('Error updating business status', { businessId: id, status, error: this.formatError(error) });
      throw error;
    }
  }

  async updateVerificationStatus(id: string, status: VerificationStatus, verifiedBy?: string): Promise<void> {
    try {
      await this.prisma.business.update({
        where: { id },
        data: {
          verificationStatus: status as never,
          verifiedAt: status === VerificationStatus.VERIFIED ? new Date() : undefined,
          verifiedBy: status === VerificationStatus.VERIFIED ? verifiedBy : undefined
        }
      });
      logger.info('Business verification status updated', { businessId: id, status });
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new BusinessNotFoundError('Business not found');
      }
      logger.error('Error updating verification status', { businessId: id, status, error: this.formatError(error) });
      throw error;
    }
  }

  async getBusinessStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byVerificationStatus: Record<string, number>;
  }> {
    try {
      const total = await this.prisma.business.count();
      const statusResults = await this.prisma.business.groupBy({
        by: ['status'],
        _count: { status: true }
      });
      const verificationResults = await this.prisma.business.groupBy({
        by: ['verificationStatus'],
        _count: { verificationStatus: true }
      });

      const byStatus: Record<string, number> = {};
      statusResults.forEach(r => {
        byStatus[r.status] = r._count.status;
      });

      const byVerificationStatus: Record<string, number> = {};
      verificationResults.forEach(r => {
        byVerificationStatus[r.verificationStatus] = r._count.verificationStatus;
      });

      return { total, byStatus, byVerificationStatus };
    } catch (error) {
      logger.error('Error getting business statistics', { error: this.formatError(error) });
      throw error;
    }
  }

  async bulkUpdateStatus(
    ids: string[],
    status: BusinessStatus
  ): Promise<{ successCount: number; failures: Array<{ id: string; error: string }> }> {
    const result = { successCount: 0, failures: [] as Array<{ id: string; error: string }> };
    for (const id of ids) {
      try {
        await this.updateStatus(id, status);
        result.successCount++;
      } catch (error) {
        result.failures.push({ id, error: this.formatError(error) });
      }
    }
    return result;
  }

  private mapToDomain(data: {
    id: string;
    name: string;
    businessType: string;
    registrationNumber: string;
    taxId: string | null;
    status: string;
    verificationStatus: string;
    complianceStatus: string;
    ownerId: string;
    description: string | null;
    industry: string[] | string | null;
    website: string | null;
    email: string | null;
    phoneNumber: string | null;
    verifiedAt: Date | null;
    verifiedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
    addresses?: Array<{
      id: string;
      type: string;
      street: string;
      city: string;
      region: string;
      postalCode: string | null;
      country: string;
      isPrimary: boolean;
    }>;
  }): Business {
    const registrationNumber = RegistrationNumber.create(data.registrationNumber);
    const taxId = data.taxId ? TaxId.create(data.taxId) : undefined;
    const industries = Array.isArray(data.industry)
      ? data.industry
      : typeof data.industry === 'string'
        ? [data.industry]
        : [];
    const addresses = (data.addresses ?? []).map(addr =>
      BusinessAddress.create({
        id: addr.id,
        type: addr.type as 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OTHER',
        street: addr.street,
        city: addr.city,
        region: addr.region,
        postalCode: addr.postalCode ?? undefined,
        country: addr.country,
        isPrimary: addr.isPrimary
      })
    );

    return new Business({
      id: data.id,
      name: data.name,
      businessType: data.businessType as never,
      registrationNumber,
      taxId,
      status: data.status as BusinessStatus,
      verificationStatus: data.verificationStatus as VerificationStatus,
      complianceStatus: data.complianceStatus as never,
      ownerId: data.ownerId,
      description: data.description ?? undefined,
      industry: industries,
      website: data.website ?? undefined,
      email: data.email ?? undefined,
      phoneNumber: data.phoneNumber ?? undefined,
      verifiedAt: data.verifiedAt ?? undefined,
      verifiedBy: data.verifiedBy ?? undefined,
      addresses,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

  private buildPublicDiscoveryWhere(filters: PublicBusinessDiscoveryFilters): Prisma.BusinessWhereInput {
    const industries = this.normalizeIndustryList(filters.industry, filters.industries);
    const normalizedSellerIds = Array.isArray(filters.sellerIds)
      ? filters.sellerIds.map((sellerId) => sellerId.trim()).filter((sellerId) => sellerId.length > 0)
      : [];
    const ownerFilter = typeof filters.sellerId === 'string' && filters.sellerId.trim().length > 0
      ? { ownerId: filters.sellerId.trim() }
      : normalizedSellerIds.length > 0
        ? { ownerId: { in: normalizedSellerIds } }
        : {};
    const query = typeof filters.query === 'string' ? filters.query.trim() : '';
    const searchTerms = query.length > 0
      ? query.toLowerCase().split(/[\s,]+/).filter(Boolean)
      : [];

    return {
      status: BusinessStatus.ACTIVE,
      verificationStatus: VerificationStatus.VERIFIED,
      complianceStatus: { not: ComplianceStatus.NON_COMPLIANT } as never,
      ...ownerFilter,
      ...(industries.length === 1
        ? { industry: { has: industries[0] } }
        : industries.length > 1
          ? { industry: { hasSome: industries } }
          : {}),
      ...(query.length > 0
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { registrationNumber: { contains: query, mode: 'insensitive' } },
              ...(searchTerms.length > 0 ? [{ industry: { hasSome: searchTerms } }] : [])
            ]
          }
        : {})
    };
  }

  private normalizeIndustryList(primary?: string, secondary?: string[]): string[] {
    const rawValues = [
      ...(typeof primary === 'string' ? [primary] : []),
      ...(Array.isArray(secondary) ? secondary : [])
    ];

    const normalized = rawValues
      .flatMap((value) => value.split(','))
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0);

    return Array.from(new Set(normalized));
  }

  private normalizeLimit(limit?: number): number | undefined {
    if (typeof limit !== 'number' || Number.isNaN(limit)) {
      return undefined;
    }
    return Math.max(1, Math.min(Math.floor(limit), 101));
  }

  private normalizeOffset(offset?: number): number | undefined {
    if (typeof offset !== 'number' || Number.isNaN(offset)) {
      return undefined;
    }
    return Math.max(0, Math.floor(offset));
  }
}
