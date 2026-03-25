import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import {
    IEnablerAnalyticsRepository,
    EnablerReferralTrackingMetadata
} from '../../domain/repositories/enabler-analytics.repository.interface';
import { generateEnablerCode, normalizeEnablerCode, toShortEnablerCode } from '@shared/ids/public-codes';
import { GenerateEnablerReferralLinkDto, EnablerReferralLinkResponseDto } from '../dto/enabler-referral.dto';
import { GetEnablerReferralLinkUseCase } from './get-enabler-referral-link.use-case';

const DEFAULT_LANDING_PATH = '/';

export class GenerateEnablerReferralLinkUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly analyticsRepository: IEnablerAnalyticsRepository,
        private readonly getReferralLinkUseCase: GetEnablerReferralLinkUseCase
    ) { }

    async execute(enablerId: string, dto: GenerateEnablerReferralLinkDto): Promise<EnablerReferralLinkResponseDto> {
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        if (!enabler.isApproved && !enabler.isActive) {
            throw new Error('Enabler referral links are only available for approved enablers');
        }

        const normalizedExistingCode = normalizeEnablerCode(enabler.enablerCode);
        const normalizedExistingShortCode = toShortEnablerCode(enabler.enablerCode);
        if (!normalizedExistingCode || !normalizedExistingShortCode) {
            const code = await this.generateUniqueEnablerCode();
            enabler.assignEnablerCode(code, toShortEnablerCode(code) || undefined);
            await this.enablerRepository.update(enabler);
        }

        const existingAnalytics = await this.analyticsRepository.getSnapshot(enabler.id);
        const existingTracking = existingAnalytics.metadata?.referralLink as EnablerReferralTrackingMetadata | undefined;
        const now = new Date().toISOString();

        await this.analyticsRepository.upsertReferralTracking(enabler.id, {
            clicks: existingTracking?.clicks ?? 0,
            signUps: existingTracking?.signUps ?? 0,
            checkouts: existingTracking?.checkouts ?? 0,
            conversions: existingTracking?.conversions ?? 0,
            landingPath: dto.landingPath || existingTracking?.landingPath || DEFAULT_LANDING_PATH,
            campaignName: dto.campaignName || existingTracking?.campaignName,
            generatedAt: existingTracking?.generatedAt || now,
            updatedAt: now,
            lastTrackedAt: existingTracking?.lastTrackedAt
        });

        return this.getReferralLinkUseCase.execute(enabler.id);
    }

    private async generateUniqueEnablerCode(): Promise<string> {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const code = generateEnablerCode();
            const normalized = normalizeEnablerCode(code) || code;
            const existing = await this.enablerRepository.findByCode(normalized);
            if (!existing) {
                return normalized;
            }
        }
        throw new Error('Unable to generate a unique enabler referral code');
    }
}
