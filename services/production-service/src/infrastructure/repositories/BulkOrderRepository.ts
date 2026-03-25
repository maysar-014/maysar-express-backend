import { Prisma, PrismaClient } from '@prisma/client';
import {
    BulkOrderQuoteResponseDto,
    BulkOrderQuoteStatus,
    BulkOrderRequestResponseDto,
    BulkOrderRequestStatus,
    CreateBulkOrderRequestDto,
    ListBulkOrderRequestsDto,
    SubmitBulkOrderQuoteDto
} from '../../application/dto/bulk-order.dto';
import { IBulkOrderRepository } from '../../application/interfaces/IBulkOrderRepository';
import { getModelPrefix, makeId } from '@shared/ids/id';

type HttpError = Error & { statusCode?: number };

type BulkOrderQuoteRecord = {
    id: string;
    requestId: string;
    supplierId: string;
    unitPrice: Prisma.Decimal | number | string;
    currency: string;
    leadTimeDays: number;
    minimumOrderQuantity: Prisma.Decimal | number | string | null;
    validUntil: Date;
    notes: string | null;
    paymentTerms: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
};

type BulkOrderRequestRecord = {
    id: string;
    supplierId: string;
    buyerId: string;
    title: string;
    description: string;
    productId: string | null;
    quantity: Prisma.Decimal | number | string;
    unit: string;
    currency: string;
    targetUnitPrice: Prisma.Decimal | number | string | null;
    requiredBy: Date;
    deliveryAddress: string | null;
    notes: string | null;
    status: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    quotes?: BulkOrderQuoteRecord[];
};

interface BulkOrderRequestDelegate {
    create(args: Record<string, unknown>): Promise<BulkOrderRequestRecord>;
    findMany(args: Record<string, unknown>): Promise<BulkOrderRequestRecord[]>;
    findUnique(args: Record<string, unknown>): Promise<BulkOrderRequestRecord | null>;
    update(args: Record<string, unknown>): Promise<BulkOrderRequestRecord>;
}

interface BulkOrderQuoteDelegate {
    upsert(args: Record<string, unknown>): Promise<BulkOrderQuoteRecord>;
}

const makeHttpError = (message: string, statusCode: number): HttpError =>
    Object.assign(new Error(message), { statusCode });

const toNumber = (value: Prisma.Decimal | number | string | null | undefined): number | undefined => {
    if (value === null || value === undefined) {
        return undefined;
    }
    return Number(value);
};

const toMetadata = (value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value as Record<string, unknown>;
};

export class BulkOrderRepository implements IBulkOrderRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async createRequest(input: CreateBulkOrderRequestDto): Promise<BulkOrderRequestResponseDto> {
        const request = await this.requestDelegate.create({
            data: {
                id: makeId(getModelPrefix('Production_BulkOrderRequest')),
                supplierId: input.supplierId,
                buyerId: input.buyerId,
                title: input.title,
                description: input.description,
                productId: input.productId,
                quantity: input.quantity,
                unit: input.unit,
                currency: input.currency,
                targetUnitPrice: input.targetUnitPrice,
                requiredBy: new Date(input.requiredBy),
                deliveryAddress: input.deliveryAddress,
                notes: input.notes,
                status: BulkOrderRequestStatus.OPEN,
                metadata: input.metadata as Prisma.InputJsonValue | undefined
            },
            include: {
                quotes: {
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });

        return this.toRequestDto(request);
    }

    async listRequests(filter: ListBulkOrderRequestsDto): Promise<BulkOrderRequestResponseDto[]> {
        const requests = await this.requestDelegate.findMany({
            where: {
                ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
                ...(filter.status ? { status: filter.status } : {})
            },
            include: {
                quotes: {
                    orderBy: { updatedAt: 'desc' }
                }
            },
            orderBy: [
                { updatedAt: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        return requests.map((request) => this.toRequestDto(request));
    }

    async findRequestById(id: string): Promise<BulkOrderRequestResponseDto | null> {
        const request = await this.requestDelegate.findUnique({
            where: { id },
            include: {
                quotes: {
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });

        return request ? this.toRequestDto(request) : null;
    }

    async submitQuote(
        requestId: string,
        input: SubmitBulkOrderQuoteDto
    ): Promise<{ request: BulkOrderRequestResponseDto; quote: BulkOrderQuoteResponseDto }> {
        const existingRequest = await this.requestDelegate.findUnique({
            where: { id: requestId }
        });

        if (!existingRequest) {
            throw makeHttpError(`Bulk order request ${requestId} not found`, 404);
        }

        if (existingRequest.supplierId !== input.supplierId) {
            throw makeHttpError('Bulk order request is not assigned to this supplier', 403);
        }

        const quote = await this.quoteDelegate.upsert({
            where: {
                requestId_supplierId: {
                    requestId,
                    supplierId: input.supplierId
                }
            },
            update: {
                unitPrice: input.unitPrice,
                currency: input.currency,
                leadTimeDays: input.leadTimeDays,
                minimumOrderQuantity: input.minimumOrderQuantity,
                validUntil: new Date(input.validUntil),
                notes: input.notes,
                paymentTerms: input.paymentTerms,
                status: BulkOrderQuoteStatus.SUBMITTED
            },
            create: {
                id: makeId(getModelPrefix('Production_BulkOrderQuote')),
                requestId,
                supplierId: input.supplierId,
                unitPrice: input.unitPrice,
                currency: input.currency,
                leadTimeDays: input.leadTimeDays,
                minimumOrderQuantity: input.minimumOrderQuantity,
                validUntil: new Date(input.validUntil),
                notes: input.notes,
                paymentTerms: input.paymentTerms,
                status: BulkOrderQuoteStatus.SUBMITTED
            }
        });

        const updatedRequest = await this.requestDelegate.update({
            where: { id: requestId },
            data: {
                status: BulkOrderRequestStatus.QUOTED
            },
            include: {
                quotes: {
                    orderBy: { updatedAt: 'desc' }
                }
            }
        });

        return {
            request: this.toRequestDto(updatedRequest),
            quote: this.toQuoteDto(quote)
        };
    }

    private toRequestDto(record: BulkOrderRequestRecord): BulkOrderRequestResponseDto {
        const quotes = (record.quotes || []).map((quote) => this.toQuoteDto(quote));

        return {
            id: record.id,
            supplierId: record.supplierId,
            buyerId: record.buyerId,
            title: record.title,
            description: record.description,
            productId: record.productId ?? undefined,
            quantity: Number(record.quantity),
            unit: record.unit,
            currency: record.currency,
            targetUnitPrice: toNumber(record.targetUnitPrice),
            requiredBy: record.requiredBy.toISOString(),
            deliveryAddress: record.deliveryAddress ?? undefined,
            notes: record.notes ?? undefined,
            status: record.status as BulkOrderRequestStatus,
            quoteCount: quotes.length,
            latestQuoteAt: quotes[0]?.updatedAt ?? null,
            quotes,
            metadata: toMetadata(record.metadata),
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString()
        };
    }

    private toQuoteDto(record: BulkOrderQuoteRecord): BulkOrderQuoteResponseDto {
        return {
            id: record.id,
            requestId: record.requestId,
            supplierId: record.supplierId,
            unitPrice: Number(record.unitPrice),
            currency: record.currency,
            leadTimeDays: record.leadTimeDays,
            minimumOrderQuantity: toNumber(record.minimumOrderQuantity),
            validUntil: record.validUntil.toISOString(),
            notes: record.notes ?? undefined,
            paymentTerms: record.paymentTerms ?? undefined,
            status: record.status as BulkOrderQuoteStatus,
            createdAt: record.createdAt.toISOString(),
            updatedAt: record.updatedAt.toISOString()
        };
    }

    private get requestDelegate(): BulkOrderRequestDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = client.production_BulkOrderRequest as BulkOrderRequestDelegate | undefined;
        if (!delegate) {
            throw new Error('Production bulk-order request delegate is not configured on prisma client');
        }
        return delegate;
    }

    private get quoteDelegate(): BulkOrderQuoteDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = client.production_BulkOrderQuote as BulkOrderQuoteDelegate | undefined;
        if (!delegate) {
            throw new Error('Production bulk-order quote delegate is not configured on prisma client');
        }
        return delegate;
    }
}
