/**
 * Prisma implementation of RequestAssessmentRepository (Phase 1 §1.3).
 * Immutable records — save only.
 */

import { RequestAssessment } from '../../domain/entities/request-assessment.entity';
import { RequestAssessmentRepository } from '../../domain/repositories/request-assessment.repository';

export class PrismaRequestAssessmentRepository implements RequestAssessmentRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(assessment: RequestAssessment): Promise<void> {
    const data = assessment.toJSON();
    await this.prisma?.request_Assessment?.create?.({
      data: {
        id: data.id,
        requestId: data.requestId,
        providerId: data.providerId,
        decision: data.decision,
        unfulfillableReason: data.unfulfillableReason,
        internalNotes: data.internalNotes,
        assessedAt: data.assessedAt,
      },
    });
  }

  async findById(id: string): Promise<RequestAssessment | null> {
    const row = await this.prisma?.request_Assessment?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async listByRequest(requestId: string): Promise<RequestAssessment[]> {
    const rows = await this.prisma?.request_Assessment?.findMany?.({
      where: { requestId },
      orderBy: { assessedAt: 'desc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): RequestAssessment {
    return new RequestAssessment({
      id: row.id,
      requestId: row.requestId,
      providerId: row.providerId,
      decision: row.decision,
      unfulfillableReason: row.unfulfillableReason,
      internalNotes: row.internalNotes,
      assessedAt: row.assessedAt,
    });
  }
}