export type CampaignRecord = Record<string, unknown>;

export interface ICampaignRepository {
  save(campaign: CampaignRecord): Promise<void>;
  findById(id: string): Promise<CampaignRecord | null>;
  findBySellerId(sellerId: string): Promise<CampaignRecord[]>;
  findAll(filters?: Record<string, unknown>): Promise<CampaignRecord[]>;
  update(id: string, data: CampaignRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ICampaignValidator {
  validate(campaign: CampaignRecord): Promise<{ valid: boolean; errors: string[] }>;
}

export interface ICampaignEngine {
  calculateDiscount(campaign: CampaignRecord, orderAmount: number): number;
  isEligible(campaign: CampaignRecord, userId: string): Promise<boolean>;
}
