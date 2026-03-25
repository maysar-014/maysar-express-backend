export type EnablerReferralEventType = 'click' | 'signup' | 'checkout' | 'conversion';

export interface GenerateEnablerReferralLinkDto {
    landingPath?: string;
    campaignName?: string;
}

export interface TrackEnablerReferralEventDto {
    eventType: EnablerReferralEventType;
}

export interface EnablerReferralTrackingDto {
    clicks: number;
    signUps: number;
    checkouts: number;
    conversions: number;
    ordersAttributed: number;
    revenueAttributed: number;
    commissionEarned: number;
    conversionRate: number;
    lastTrackedAt?: string;
}

export interface EnablerReferralLinkResponseDto {
    enablerId: string;
    code: string;
    shortCode: string;
    shareUrl: string;
    shortUrl: string;
    landingPath: string;
    campaignName?: string;
    generatedAt: string;
    updatedAt: string;
    tracking: EnablerReferralTrackingDto;
}
