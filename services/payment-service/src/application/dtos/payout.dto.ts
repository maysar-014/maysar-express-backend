
export interface CreatePayoutDto {
    userId: string;
    amount: number;
    currency: string;
    method: string;
    details: {
        accountNumber: string;
        accountName: string;
        bankCode?: string;
        provider?: string;
    };
    description?: string;
}

export interface PayoutResponseDto {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    createdAt: Date;
    updatedAt: Date;
    providerReference?: string;
}
