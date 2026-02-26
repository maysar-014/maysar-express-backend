import { CampaignType, CampaignStatus } from './enums';

export class Campaign {
  constructor(
    public id: string,
    public name: string,
    public type: CampaignType,
    public status: CampaignStatus,
    public startDate: Date,
    public endDate: Date
  ) {}
}
