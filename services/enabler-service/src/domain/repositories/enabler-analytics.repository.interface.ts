export interface EnablerReferralTrackingMetadata {
  landingPath?: string;
  campaignName?: string;
  generatedAt?: string;
  updatedAt?: string;
  clicks?: number;
  signUps?: number;
  checkouts?: number;
  conversions?: number;
  lastTrackedAt?: string;
}

export interface EnablerAnalyticsSnapshot {
  totalSales: number;
  totalOrders: number;
  conversionRate: number;
  totalCommissions: number;
  metadata?: Record<string, any> | null;
}

export interface IEnablerAnalyticsRepository {
  upsertInitial(enablerId: string): Promise<void>;
  getSnapshot(enablerId: string): Promise<EnablerAnalyticsSnapshot>;
  upsertReferralTracking(enablerId: string, referralTracking: EnablerReferralTrackingMetadata): Promise<EnablerAnalyticsSnapshot>;
}
