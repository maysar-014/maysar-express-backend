import { PrismaClient } from '@prisma/client';
import { IBusinessRepository } from '../../domain/repositories';
import { Business } from '../../domain/entities/business.entity';
import { BusinessId } from '../../domain/value-objects/business-id.value-object';
import { RegistrationNumber } from '../../domain/value-objects/registration-number.value-object';
import { TaxId } from '../../domain/value-objects/tax-id.value-object';
import { BusinessAddress } from '../../domain/value-objects/business-address.value-object';
import { BusinessStatus, VerificationStatus } from '../../domain/types/business.types';
import { logger } from '../services/logger.service';

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
        const existingIds = new Set(existingAddresses.map((a) => a.id));
        const providedIds = new Set(business.addresses.map((a) => a.getId()));

        const toDelete = [...existingIds].filter((id) => !providedIds.has(id));
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
        throw new Error(`Business ${business.id} not found after update`);
      }
      return this.mapToDomain(data);
    } catch (error) {
      logger.error('Error updating business', { businessId: business.id, error: this.formatError(error) });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.business.delete({ where: { id } });
      logger.info('Business deleted successfully', { businessId: id });
    } catch (error) {
      logger.error('Error deleting business', { businessId: id, error: this.formatError(error) });
      throw error;
    }
  }

  async search(query: string, limit = 50, offset = 0): Promise<Business[]> {
    try {
      const data = await this.prisma.business.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { registrationNumber: { contains: query, mode: 'insensitive' } },
            { industry: { contains: query, mode: 'insensitive' } }
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
    industry: string | null;
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
      industry: data.industry ?? undefined,
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
}
