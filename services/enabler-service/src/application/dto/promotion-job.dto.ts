export type PromotionJobView = 'available' | 'accepted' | 'all';

export interface ListPromotionJobsQueryDto {
  view?: PromotionJobView;
  sellerId?: string;
  status?: 'ACTIVE' | 'SCHEDULED';
  page?: number;
  limit?: number;
}

export interface AcceptPromotionJobDto {
  note?: string;
  acceptedByUserId?: string;
}

export interface PromotionJobDto {
  jobId: string;
  campaignId: string;
  title: string;
  description?: string;
  sellerId: string;
  type: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  timezone: string;
  productIds: string[];
  categoryIds: string[];
  pricingRuleCount: number;
  brief?: string;
  channels: string[];
  rewardEstimate?: number | null;
  acceptanceStatus: 'AVAILABLE' | 'ACCEPTED';
  acceptedAt?: string | null;
  acceptedByUserId?: string;
  note?: string;
}

export interface PromotionJobListResponseDto {
  items: PromotionJobDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
