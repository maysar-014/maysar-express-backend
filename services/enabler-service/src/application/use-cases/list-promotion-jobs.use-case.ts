import type {
  IEnablerPromotionJobAssignmentRepository,
  PromotionJobAcceptanceRecord
} from '../../domain/repositories/enabler-promotion-job-assignment.repository.interface';
import type { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import type { IPromotionJobRepository } from '../../domain/repositories/promotion-job.repository.interface';
import type {
  ListPromotionJobsQueryDto,
  PromotionJobDto,
  PromotionJobListResponseDto
} from '../dto/promotion-job.dto';
import { PromotionJobEntity } from '../../domain/entities/promotion-job.entity';

const DEFAULT_VIEW = 'available';

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

export class ListPromotionJobsUseCase {
  constructor(
    private readonly enablerRepository: IEnablerRepository,
    private readonly promotionJobRepository: IPromotionJobRepository,
    private readonly assignmentRepository: IEnablerPromotionJobAssignmentRepository
  ) {}

  async execute(
    enablerId: string,
    query: ListPromotionJobsQueryDto = {}
  ): Promise<PromotionJobListResponseDto> {
    const enabler = await this.enablerRepository.findById(enablerId);
    if (!enabler) {
      throw new Error('Enabler not found');
    }

    const view = query.view || DEFAULT_VIEW;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const acceptedAssignments = await this.assignmentRepository.listAccepted(enablerId);
    const acceptedMap = new Map(acceptedAssignments.map((item) => [item.jobId, item]));

    if (view === 'accepted') {
      const filtered = acceptedAssignments
        .filter((item) => !query.sellerId || item.sellerId === query.sellerId)
        .filter((item) => !query.status || item.status === query.status)
        .sort((left, right) => {
          const leftTime = Date.parse(left.acceptedAt || '');
          const rightTime = Date.parse(right.acceptedAt || '');
          return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
        });
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit).map((item) => this.mapAcceptedAssignment(item));

      return {
        items,
        pagination: {
          page,
          limit,
          total: filtered.length,
          totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / limit)
        }
      };
    }

    const pageResult = await this.promotionJobRepository.findMarketplaceJobs({
      sellerId: query.sellerId,
      status: query.status,
      page,
      limit,
      excludeIds: view === 'available' ? [...acceptedMap.keys()] : undefined
    });

    return {
      items: pageResult.items.map((job) => this.mapLiveJob(job, acceptedMap.get(job.id))),
      pagination: {
        page: pageResult.page,
        limit: pageResult.limit,
        total: pageResult.total,
        totalPages: pageResult.totalPages
      }
    };
  }

  private mapLiveJob(job: PromotionJobEntity, acceptance?: PromotionJobAcceptanceRecord): PromotionJobDto {
    const payload = job.toPlainObject();
    const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};

    return {
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
      acceptanceStatus: acceptance ? 'ACCEPTED' : 'AVAILABLE',
      acceptedAt: acceptance?.acceptedAt ?? null,
      acceptedByUserId: acceptance?.acceptedByUserId,
      note: acceptance?.note
    };
  }

  private mapAcceptedAssignment(acceptance: PromotionJobAcceptanceRecord): PromotionJobDto {
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
