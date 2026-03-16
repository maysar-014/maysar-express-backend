import { PrismaClient } from '@prisma/client';
import { IReportRepository, Report } from '../../domain/repositories';

export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Report | null> {
    const row = await this.prisma.community_Report.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findPendingReports(): Promise<Report[]> {
    const rows = await this.prisma.community_Report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  async findByEntity(entityType: string, entityId: string): Promise<Report[]> {
    const rows = await this.prisma.community_Report.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' }
    });
    return rows.map(row => this.toDomain(row));
  }

  async save(report: Report): Promise<void> {
    await this.prisma.community_Report.create({
      data: {
        id: report.id,
        reporterId: report.reporterId,
        entityType: report.entityType,
        entityId: report.entityId,
        reason: report.reason,
        description: report.description ?? null,
        status: report.status,
        reviewedBy: report.reviewedBy ?? null,
        reviewedAt: report.reviewedAt ?? null,
        resolution: report.resolution ?? null,
        createdAt: report.createdAt
      }
    });
  }

  async update(report: Report): Promise<void> {
    await this.prisma.community_Report.update({
      where: { id: report.id },
      data: {
        status: report.status,
        reviewedBy: report.reviewedBy ?? null,
        reviewedAt: report.reviewedAt ?? null,
        resolution: report.resolution ?? null
      }
    });
  }

  private toDomain(row: any): Report {
    return {
      id: row.id,
      reporterId: row.reporterId,
      entityType: row.entityType,
      entityId: row.entityId,
      reason: row.reason,
      description: row.description ?? undefined,
      status: row.status,
      reviewedBy: row.reviewedBy ?? undefined,
      reviewedAt: row.reviewedAt ?? undefined,
      resolution: row.resolution ?? undefined,
      createdAt: row.createdAt
    };
  }
}
