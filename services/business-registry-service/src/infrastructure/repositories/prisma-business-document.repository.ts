import { PrismaClient } from '@prisma/client';

export interface BusinessDocumentCreateInput {
  businessId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  status?: string;
}

export class PrismaBusinessDocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createDocument(input: BusinessDocumentCreateInput) {
    return this.prisma.businessDocument.create({
      data: {
        businessId: input.businessId,
        type: input.type as never,
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        status: input.status ? (input.status as never) : undefined
      }
    });
  }

  async findByBusinessId(businessId: string) {
    return this.prisma.businessDocument.findMany({
      where: { businessId },
      orderBy: { uploadedAt: 'desc' }
    });
  }

  async updateStatus(documentId: string, status: string, verifiedAt?: Date) {
    return this.prisma.businessDocument.update({
      where: { id: documentId },
      data: {
        status: status as never,
        verifiedAt: verifiedAt ?? (status === 'APPROVED' ? new Date() : undefined)
      }
    });
  }
}
