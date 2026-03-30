import { Campaign } from '../entities/campaign.entity';

export interface ICampaignRepository {
    findById(id: string): Promise<Campaign | null>;
    save(campaign: Campaign): Promise<void>;
    delete(id: string): Promise<void>;
    findAll(filters?: Record<string, unknown>): Promise<Campaign[]>;
    findBySellerId(sellerId: string): Promise<Campaign[]>;
}
