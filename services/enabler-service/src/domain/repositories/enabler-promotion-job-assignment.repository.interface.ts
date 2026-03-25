export interface PromotionJobAcceptanceRecord {
  taskId?: string;
  jobId: string;
  campaignId: string;
  title: string;
  description?: string;
  sellerId: string;
  type: string;
  status: string;
  taskStatus?: string;
  startsAt: string;
  endsAt?: string | null;
  timezone: string;
  productIds: string[];
  categoryIds: string[];
  pricingRuleCount: number;
  brief?: string;
  channels: string[];
  rewardEstimate?: number | null;
  metadata?: Record<string, any> | null;
  acceptedAt: string;
  acceptedByUserId?: string;
  note?: string;
}

export interface IEnablerPromotionJobAssignmentRepository {
  listAccepted(enablerId: string): Promise<PromotionJobAcceptanceRecord[]>;
  findAccepted(enablerId: string, jobId: string): Promise<PromotionJobAcceptanceRecord | null>;
  accept(enablerId: string, record: PromotionJobAcceptanceRecord): Promise<PromotionJobAcceptanceRecord>;
}
