import { CampaignValidationError } from '../errors/campaign.errors';

export class CampaignSecurityPolicy {
    validateAccess(sellerId: string, userId: string, userRole: string): void {
        if (userRole !== 'ADMIN' && sellerId !== userId) {
            throw new CampaignValidationError('Unauthorized: You do not have permission to manage this campaign');
        }
    }

    canManage(sellerId: string, userId: string, userRole: string): boolean {
        return userRole === 'ADMIN' || sellerId === userId;
    }
}
