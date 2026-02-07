import { ICampaignMetadata } from '../types/campaign.types';

export class CampaignMetadata {
    constructor(private readonly data: ICampaignMetadata = {}) { }

    get<T>(key: string, defaultValue?: T): T | undefined {
        return (this.data[key] as T) ?? defaultValue;
    }

    getAll(): ICampaignMetadata {
        return { ...this.data };
    }

    static create(data?: ICampaignMetadata): CampaignMetadata {
        return new CampaignMetadata(data);
    }
}
