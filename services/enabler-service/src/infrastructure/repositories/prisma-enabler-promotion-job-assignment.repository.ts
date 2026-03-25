import { Prisma } from '@prisma/client';
import prisma from '../database/prisma-client';
import {
  IEnablerPromotionJobAssignmentRepository,
  PromotionJobAcceptanceRecord
} from '../../domain/repositories/enabler-promotion-job-assignment.repository.interface';
import { getModelPrefix, makeId } from '../../../../../shared/ids/id';

type TaskRecord = {
  id: string;
  enablerId: string;
  sellerId: string;
  taskType: string;
  status: string;
  sourceType: string;
  sourceId: string;
  sourceStatus: string;
  campaignId: string | null;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  productIds: string[];
  categoryIds: string[];
  pricingRuleCount: number;
  brief: string | null;
  channels: string[];
  rewardEstimate: Prisma.Decimal | number | string | null;
  acceptedAt: Date;
  acceptedByUserId: string | null;
  note: string | null;
  metadata: Prisma.JsonValue | null;
};

const PROMOTION_JOB_TYPE = 'PROMOTION_JOB';
const PUBLIC_PROMOTION_TYPE = 'PROMOTION';
const TASK_STATUS_ASSIGNED = 'ASSIGNED';

const toFiniteNumber = (value: Prisma.Decimal | number | string | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export class PrismaEnablerPromotionJobAssignmentRepository implements IEnablerPromotionJobAssignmentRepository {
  async listAccepted(enablerId: string): Promise<PromotionJobAcceptanceRecord[]> {
    const records = await prisma.enabler_Task.findMany({
      where: {
        enablerId,
        taskType: PROMOTION_JOB_TYPE
      },
      orderBy: [
        { acceptedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return records.map((record) => this.toAcceptanceRecord(record as unknown as TaskRecord));
  }

  async findAccepted(enablerId: string, jobId: string): Promise<PromotionJobAcceptanceRecord | null> {
    const record = await prisma.enabler_Task.findFirst({
      where: {
        enablerId,
        sourceType: PROMOTION_JOB_TYPE,
        sourceId: jobId
      }
    });

    return record ? this.toAcceptanceRecord(record as unknown as TaskRecord) : null;
  }

  async accept(enablerId: string, record: PromotionJobAcceptanceRecord): Promise<PromotionJobAcceptanceRecord> {
    const acceptedAt = new Date(record.acceptedAt);

    const persisted = await prisma.enabler_Task.upsert({
      where: {
        enablerId_sourceType_sourceId: {
          enablerId,
          sourceType: PROMOTION_JOB_TYPE,
          sourceId: record.jobId
        }
      },
      update: {
        sellerId: record.sellerId,
        sourceStatus: record.status,
        campaignId: record.campaignId,
        title: record.title,
        description: record.description,
        startsAt: new Date(record.startsAt),
        endsAt: record.endsAt ? new Date(record.endsAt) : null,
        timezone: record.timezone,
        productIds: record.productIds,
        categoryIds: record.categoryIds,
        pricingRuleCount: record.pricingRuleCount,
        brief: record.brief,
        channels: record.channels,
        rewardEstimate: record.rewardEstimate,
        acceptedAt,
        acceptedByUserId: record.acceptedByUserId,
        note: record.note,
        metadata: (record.metadata ?? null) as Prisma.InputJsonValue
      },
      create: {
        id: makeId(getModelPrefix('Enabler_Task')),
        enablerId,
        sellerId: record.sellerId,
        taskType: PROMOTION_JOB_TYPE,
        status: record.taskStatus || TASK_STATUS_ASSIGNED,
        sourceType: PROMOTION_JOB_TYPE,
        sourceId: record.jobId,
        sourceStatus: record.status,
        campaignId: record.campaignId,
        title: record.title,
        description: record.description,
        startsAt: new Date(record.startsAt),
        endsAt: record.endsAt ? new Date(record.endsAt) : null,
        timezone: record.timezone,
        productIds: record.productIds,
        categoryIds: record.categoryIds,
        pricingRuleCount: record.pricingRuleCount,
        brief: record.brief,
        channels: record.channels,
        rewardEstimate: record.rewardEstimate,
        acceptedAt,
        acceptedByUserId: record.acceptedByUserId,
        note: record.note,
        metadata: (record.metadata ?? null) as Prisma.InputJsonValue
      }
    });

    return this.toAcceptanceRecord(persisted as unknown as TaskRecord);
  }

  private toAcceptanceRecord(record: TaskRecord): PromotionJobAcceptanceRecord {
    return {
      taskId: record.id,
      jobId: record.sourceId,
      campaignId: record.campaignId || record.sourceId,
      title: record.title,
      description: record.description ?? undefined,
      sellerId: record.sellerId,
      type: PUBLIC_PROMOTION_TYPE,
      status: record.sourceStatus,
      taskStatus: record.status,
      startsAt: record.startsAt.toISOString(),
      endsAt: record.endsAt ? record.endsAt.toISOString() : null,
      timezone: record.timezone,
      productIds: record.productIds || [],
      categoryIds: record.categoryIds || [],
      pricingRuleCount: record.pricingRuleCount,
      brief: record.brief ?? undefined,
      channels: record.channels || [],
      rewardEstimate: toFiniteNumber(record.rewardEstimate),
      metadata: record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, any>)
        : null,
      acceptedAt: record.acceptedAt.toISOString(),
      acceptedByUserId: record.acceptedByUserId ?? undefined,
      note: record.note ?? undefined
    };
  }
}
