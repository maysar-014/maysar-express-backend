export enum BulkOrderRequestStatus {
    OPEN = 'OPEN',
    UNDER_REVIEW = 'UNDER_REVIEW',
    QUOTED = 'QUOTED',
    AWARDED = 'AWARDED',
    CLOSED = 'CLOSED'
}

export enum BulkOrderQuoteStatus {
    SUBMITTED = 'SUBMITTED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED'
}

export interface CreateBulkOrderRequestDto {
    supplierId: string;
    buyerId: string;
    title: string;
    description: string;
    productId?: string;
    quantity: number;
    unit: string;
    currency: string;
    targetUnitPrice?: number;
    requiredBy: string;
    deliveryAddress?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}

export interface ListBulkOrderRequestsDto {
    supplierId?: string;
    status?: BulkOrderRequestStatus;
}

export interface SubmitBulkOrderQuoteDto {
    supplierId: string;
    unitPrice: number;
    currency: string;
    leadTimeDays: number;
    minimumOrderQuantity?: number;
    validUntil: string;
    notes?: string;
    paymentTerms?: string;
}

export interface BulkOrderQuoteResponseDto {
    id: string;
    requestId: string;
    supplierId: string;
    unitPrice: number;
    currency: string;
    leadTimeDays: number;
    minimumOrderQuantity?: number;
    validUntil: string;
    notes?: string;
    paymentTerms?: string;
    status: BulkOrderQuoteStatus;
    createdAt: string;
    updatedAt: string;
}

export interface BulkOrderRequestResponseDto {
    id: string;
    supplierId: string;
    buyerId: string;
    title: string;
    description: string;
    productId?: string;
    quantity: number;
    unit: string;
    currency: string;
    targetUnitPrice?: number;
    requiredBy: string;
    deliveryAddress?: string;
    notes?: string;
    status: BulkOrderRequestStatus;
    quoteCount: number;
    latestQuoteAt?: string | null;
    quotes: BulkOrderQuoteResponseDto[];
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
