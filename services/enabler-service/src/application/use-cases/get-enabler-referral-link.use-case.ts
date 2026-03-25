import {
    EnablerReferralLinkResponseDto,
    EnablerReferralTrackingDto
} from '../dto/enabler-referral.dto';
import {
    EnablerAnalyticsSnapshot,
    EnablerReferralTrackingMetadata,
    IEnablerAnalyticsRepository
} from '../../domain/repositories/enabler-analytics.repository.interface';
import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { generateEnablerCode, normalizeEnablerCode, toShortEnablerCode } from '@shared/ids/public-codes';

const DEFAULT_BASE_URL = process.env.BASE_URL || 'https://maysar.co.tz';
const DEFAULT_LANDING_PATH = '/';

const normalizeLandingPath = (value?: string | null): string => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return DEFAULT_LANDING_PATH;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const buildUrlWithCode = (baseUrl: string, landingPath: string, code: string): string => {
    const url = new URL(baseUrl);
    const pathWithQuery = landingPath.startsWith('/') ? landingPath : `/${landingPath}`;
    const [pathname, query = ''] = pathWithQuery.split('?');
    url.pathname = pathname || '/';
    const params = new URLSearchParams(query);
    params.set('enablerCode', code);
    url.search = params.toString();
    return url.toString();
};

const toNumber = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value) || 0;
    if (value && typeof value === 'object' && 'toString' in value) {
        const numeric = Number(String(value));
        return Number.isFinite(numeric) ? numeric : 0;
    }
    return 0;
};

export class GetEnablerReferralLinkUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly analyticsRepository: IEnablerAnalyticsRepository,
        private readonly baseUrl: string = DEFAULT_BASE_URL
    ) { }

    async execute(enablerId: string): Promise<EnablerReferralLinkResponseDto> {
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        let code = normalizeEnablerCode(enabler.enablerCode);
        let shortCode = toShortEnablerCode(enabler.enablerCode);

        if (!code || !shortCode) {
            const repairedCode = await this.generateUniqueEnablerCode();
            shortCode = toShortEnablerCode(repairedCode);
            enabler.assignEnablerCode(repairedCode, shortCode || undefined);
            await this.enablerRepository.update(enabler);
            code = repairedCode;
        }

        if (!shortCode) {
            throw new Error('Enabler short code is unavailable');
        }

        const analytics = await this.analyticsRepository.getSnapshot(enabler.id);
        const referralTracking = this.getReferralTracking(analytics);
        const landingPath = normalizeLandingPath(referralTracking.landingPath);
        const generatedAt = referralTracking.generatedAt || enabler.toPlainObject().updatedAt.toISOString();
        const updatedAt = referralTracking.updatedAt || generatedAt;

        return {
            enablerId: enabler.id,
            code,
            shortCode,
            shareUrl: buildUrlWithCode(this.baseUrl, landingPath, code),
            shortUrl: buildUrlWithCode(this.baseUrl, landingPath, shortCode),
            landingPath,
            campaignName: referralTracking.campaignName,
            generatedAt,
            updatedAt,
            tracking: this.buildTracking(analytics, referralTracking)
        };
    }

    protected getReferralTracking(analytics: EnablerAnalyticsSnapshot): EnablerReferralTrackingMetadata {
        const metadata = analytics.metadata && typeof analytics.metadata === 'object'
            ? analytics.metadata
            : {};
        const referralTracking = metadata.referralLink;
        if (!referralTracking || typeof referralTracking !== 'object') {
            return {};
        }
        return referralTracking as EnablerReferralTrackingMetadata;
    }

    private buildTracking(
        analytics: EnablerAnalyticsSnapshot,
        referralTracking: EnablerReferralTrackingMetadata
    ): EnablerReferralTrackingDto {
        const clicks = toNumber(referralTracking.clicks);
        const signUps = toNumber(referralTracking.signUps);
        const checkouts = toNumber(referralTracking.checkouts);
        const conversions = toNumber(referralTracking.conversions);
        const analyticsConversionRate = toNumber(analytics.conversionRate);
        const conversionRate = clicks > 0
            ? Number((conversions / clicks).toFixed(4))
            : analyticsConversionRate;

        return {
            clicks,
            signUps,
            checkouts,
            conversions,
            ordersAttributed: toNumber(analytics.totalOrders),
            revenueAttributed: toNumber(analytics.totalSales),
            commissionEarned: toNumber(analytics.totalCommissions),
            conversionRate,
            lastTrackedAt: referralTracking.lastTrackedAt
        };
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
