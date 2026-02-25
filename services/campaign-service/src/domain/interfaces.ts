import { CampaignStatus, CampaignType } from './enums';

export interface ICampaignRepository {
  save(campaign: any): Promise<void>;
  findById(id: string): Promise<any | null>;
  findBySellerId(sellerId: string): Promise<any[]>;
  update(id: string, data: any): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ICampaignValidator {
  validate(campaign: any): Promise<{ valid: boolean; errors: string[] }>;
}

export interface ICampaignEngine {
  calculateDiscount(campaign: any, orderAmount: number): number;
  isEligible(campaign: any, userId: string): Promise<boolean>;
}
