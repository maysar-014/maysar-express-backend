export class RegisterEnablerDto {
    userId: string;
    businessName: string;
    contactEmail: string;
    contactPhone?: string;
    businessDescription?: string;
    taxId?: string;
    yearsInBusiness?: number;
    hasBusinessLicense: boolean;
    salesExperience: number;
}

export class EnablerResponseDto {
    id: string;
    userId: string;
    businessName: string;
    status: string;
    tier: string;
    verificationStatus: string;
    commissionRate: number;
    createdAt: Date;
}

export class UpdateEnablerProfileDto {
    businessName?: string;
    contactEmail?: string;
    contactPhone?: string;
    businessDescription?: string;
    taxId?: string;
}

export class EnablerAnalyticsDto {
    totalSales: number;
    totalOrders: number;
    conversionRate: number;
    customerRating?: number;
    totalCommissionEarned: number;
    tier: string;
}
