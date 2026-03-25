import { TaskAssignedEvent } from '../../domain/events/enabler-events';
import type { IEnablerPromotionJobAssignmentRepository } from '../../domain/repositories/enabler-promotion-job-assignment.repository.interface';
import type { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import type { IPromotionJobRepository } from '../../domain/repositories/promotion-job.repository.interface';
import type { AcceptPromotionJobDto, PromotionJobDto } from '../dto/promotion-job.dto';

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeChannels = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

export class AcceptPromotionJobUseCase {
  constructor(
    private readonly enablerRepository: IEnablerRepository,
    private readonly promotionJobRepository: IPromotionJobRepository,
    private readonly assignmentRepository: IEnablerPromotionJobAssignmentRepository,
    private readonly eventPublisher: { publish(event: unknown): Promise<void> }
  ) {}

  async execute(enablerId: string, jobId: string, dto: AcceptPromotionJobDto = {}): Promise<PromotionJobDto> {
    const enabler = await this.enablerRepository.findById(enablerId);
    if (!enabler) {
      throw new Error('Enabler not found');
    }

    if (!enabler.isApproved && !enabler.isActive) {
      throw new Error('Promotion jobs are only available to approved enablers');
    }

    const existingAcceptance = await this.assignmentRepository.findAccepted(enablerId, jobId);
    if (existingAcceptance) {
      throw new Error('Promotion job already accepted');
    }

    const job = await this.promotionJobRepository.findById(jobId);
    if (!job) {
      throw new Error('Promotion job not found');
    }

    if (!job.canBeAccepted()) {
      throw new Error('Promotion job is not available for acceptance');
    }

    const payload = job.toPlainObject();
    const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
    const acceptedAt = new Date().toISOString();
    const acceptance = await this.assignmentRepository.accept(enablerId, {
      jobId: payload.id,
      campaignId: payload.campaignId,
      title: payload.title,
      description: payload.description,
      sellerId: payload.sellerId,
      type: payload.type,
      status: payload.status,
      startsAt: payload.startDate.toISOString(),
      endsAt: payload.endDate ? payload.endDate.toISOString() : null,
      timezone: payload.timezone,
      productIds: payload.productIds,
      categoryIds: payload.categoryIds,
      pricingRuleCount: payload.pricingRuleCount,
      brief: typeof metadata.brief === 'string' ? metadata.brief : payload.description,
      channels: normalizeChannels(metadata.channels),
      rewardEstimate: toFiniteNumber(metadata.rewardEstimate ?? metadata.budget ?? metadata.payoutAmount),
      metadata,
      acceptedAt,
      acceptedByUserId: dto.acceptedByUserId,
      note: dto.note
    });

    await this.eventPublisher.publish(
      new TaskAssignedEvent(
        acceptance.taskId || payload.id,
        enablerId,
        payload.sellerId,
        'PROMOTION_JOB',
        acceptance.rewardEstimate ?? 0
      )
    );

    return {
      jobId: acceptance.jobId,
      campaignId: acceptance.campaignId,
      title: acceptance.title,
      description: acceptance.description,
      sellerId: acceptance.sellerId,
      type: acceptance.type,
      status: acceptance.status,
      startsAt: acceptance.startsAt,
      endsAt: acceptance.endsAt ?? null,
      timezone: acceptance.timezone,
      productIds: acceptance.productIds,
      categoryIds: acceptance.categoryIds,
      pricingRuleCount: acceptance.pricingRuleCount,
      brief: acceptance.brief,
      channels: acceptance.channels,
      rewardEstimate: acceptance.rewardEstimate ?? null,
      acceptanceStatus: 'ACCEPTED',
      acceptedAt: acceptance.acceptedAt,
      acceptedByUserId: acceptance.acceptedByUserId,
      note: acceptance.note
    };
  }
}
