import { UUID, Money } from './types';

export namespace CampaignService {
    export namespace Events {
        export interface CampaignStarted {
            campaignId: UUID;
            name: string;
            startedAt: Date;
        }

        export interface CampaignEnded {
            campaignId: UUID;
            reason: string;
            endedAt: Date;
        }
    }

    export namespace Commands {
        export interface StartCampaign {
            campaignId: UUID;
        }

        export interface EndCampaign {
            campaignId: UUID;
            reason: string;
        }
    }
}
