import { PrismaClient } from '@prisma/client';

export interface BusinessComplianceRecordCreateInput {
  businessId: string;
  type: string;
  status: string;
  expiresAt?: Date | null;
  notes?: string;
}

export class PrismaBusinessComplianceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createRecord(input: BusinessComplianceRecordCreateInput) {
    return this.prisma.businessRegistry_ComplianceRecord.create({
      data: {
        businessId: input.businessId,
        type: input.type as never,
        status: input.status as never,
        expiresAt: input.expiresAt ?? null,
        notes: input.notes ?? null
      }
    });
  }

  async findByBusinessId(businessId: string) {
    return this.prisma.businessRegistry_ComplianceRecord.findMany({
      where: { businessId },
      orderBy: { checkedAt: 'desc' }
    });
  }

  async updateStatus(recordId: string, status: string, notes?: string) {
    return this.prisma.businessRegistry_ComplianceRecord.update({
      where: { id: recordId },
      data: {
        status: status as never,
        notes: notes ?? undefined,
        checkedAt: new Date()
      }
    });
  }
}
