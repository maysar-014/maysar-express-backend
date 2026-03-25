import { IEnablerAnalyticsRepository } from '../../domain/repositories/enabler-analytics.repository.interface';
import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { EnablerReferralEventType, EnablerReferralLinkResponseDto } from '../dto/enabler-referral.dto';
import { GetEnablerReferralLinkUseCase } from './get-enabler-referral-link.use-case';

const EVENT_COUNTER_FIELD: Record<EnablerReferralEventType, 'clicks' | 'signUps' | 'checkouts' | 'conversions'> = {
    click: 'clicks',
    signup: 'signUps',
    checkout: 'checkouts',
    conversion: 'conversions'
};

export class TrackEnablerReferralEventUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly analyticsRepository: IEnablerAnalyticsRepository,
        private readonly getReferralLinkUseCase: GetEnablerReferralLinkUseCase
    ) { }

    async execute(enablerId: string, eventType: EnablerReferralEventType): Promise<EnablerReferralLinkResponseDto> {
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        const analytics = await this.analyticsRepository.getSnapshot(enabler.id);
        const referralTracking = (analytics.metadata?.referralLink || {}) as Record<string, any>;
        const field = EVENT_COUNTER_FIELD[eventType];
        const now = new Date().toISOString();

        await this.analyticsRepository.upsertReferralTracking(enabler.id, {
            ...referralTracking,
            [field]: Number(referralTracking[field] || 0) + 1,
            updatedAt: now,
            lastTrackedAt: now
        });

        return this.getReferralLinkUseCase.execute(enabler.id);
    }
}
