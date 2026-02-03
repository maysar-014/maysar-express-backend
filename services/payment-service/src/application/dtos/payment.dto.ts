
export interface CreatePaymentDto {
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    method: string;
    customerInfo: {
        email?: string;
        phoneNumber?: string;
        name?: string;
        ipAddress?: string;
        deviceFingerprint?: string;
    };
    metadata?: Record<string, any>;
}

export interface RefundPaymentDto {
    paymentId: string;
    amount: number;
    reason: string;
    reasonDetails?: string;
    requestedBy: string;
}

export interface PaymentResponseDto {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    providerReference?: string;
    createdAt: Date;
    updatedAt: Date;
}
