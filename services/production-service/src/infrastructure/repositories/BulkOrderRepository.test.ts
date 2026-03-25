import { BulkOrderRepository } from './BulkOrderRepository';

describe('BulkOrderRepository', () => {
    const requests = new Map<string, any>();
    const quotes = new Map<string, any>();

    const attachQuotes = (request: any) => ({
        ...request,
        quotes: Array.from(quotes.values())
            .filter((quote) => quote.requestId === request.id)
            .sort((left, right) => Date.parse(right.updatedAt.toISOString()) - Date.parse(left.updatedAt.toISOString()))
    });

    const prisma = {
        production_BulkOrderRequest: {
            create: jest.fn(async ({ data }: any) => {
                const record = {
                    ...data,
                    createdAt: new Date('2026-03-23T09:00:00.000Z'),
                    updatedAt: new Date('2026-03-23T09:00:00.000Z')
                };
                requests.set(record.id, record);
                return attachQuotes(record);
            }),
            findMany: jest.fn(async ({ where }: any) =>
                Array.from(requests.values())
                    .filter((request) => !where?.supplierId || request.supplierId === where.supplierId)
                    .filter((request) => !where?.status || request.status === where.status)
                    .map(attachQuotes)
            ),
            findUnique: jest.fn(async ({ where }: any) => {
                const request = requests.get(where.id);
                return request ? attachQuotes(request) : null;
            }),
            update: jest.fn(async ({ where, data }: any) => {
                const existing = requests.get(where.id);
                const updated = {
                    ...existing,
                    ...data,
                    updatedAt: new Date('2026-03-23T10:00:00.000Z')
                };
                requests.set(where.id, updated);
                return attachQuotes(updated);
            })
        },
        production_BulkOrderQuote: {
            upsert: jest.fn(async ({ where, update, create }: any) => {
                const key = `${where.requestId_supplierId.requestId}:${where.requestId_supplierId.supplierId}`;
                const existing = quotes.get(key);
                const record = existing
                    ? {
                        ...existing,
                        ...update,
                        updatedAt: new Date('2026-03-23T10:00:00.000Z')
                    }
                    : {
                        ...create,
                        createdAt: new Date('2026-03-23T10:00:00.000Z'),
                        updatedAt: new Date('2026-03-23T10:00:00.000Z')
                    };
                quotes.set(key, record);
                return record;
            })
        }
    };

    let repository: BulkOrderRepository;

    beforeEach(() => {
        requests.clear();
        quotes.clear();
        jest.clearAllMocks();

        requests.set('prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV', {
            id: 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            buyerId: 'usr_test_0001',
            title: 'Bulk order for 5,000 woven bags',
            description: 'Buyer is sourcing 5,000 branded woven bags.',
            productId: 'cat_prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            quantity: 5000,
            unit: 'bags',
            currency: 'TZS',
            targetUnitPrice: 4200,
            requiredBy: new Date('2026-04-15T09:00:00.000Z'),
            deliveryAddress: 'Mbezi Industrial Area, Dar es Salaam',
            notes: 'Include branding setup cost in the quote notes if applicable.',
            status: 'OPEN',
            metadata: { requestedByChannel: 'supplier-portal' },
            createdAt: new Date('2026-03-23T09:00:00.000Z'),
            updatedAt: new Date('2026-03-23T09:00:00.000Z')
        });

        repository = new BulkOrderRepository(prisma as never);
    });

    it('returns the seeded supplier bulk-order request', async () => {
        const requests = await repository.listRequests({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        });

        expect(requests).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV',
                    status: 'OPEN'
                })
            ])
        );
    });

    it('submits a supplier quote and updates the request status', async () => {
        const result = await repository.submitQuote('prd_bulord_01ARZ3NDEKTSV4RRFFQ69G5FAV', {
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            unitPrice: 3900,
            currency: 'TZS',
            leadTimeDays: 12,
            validUntil: '2026-04-01T09:00:00.000Z',
            notes: 'Includes packaging and standard branding setup.'
        });

        expect(result.quote.unitPrice).toBe(3900);
        expect(result.request.status).toBe('QUOTED');
        expect(result.request.quoteCount).toBeGreaterThanOrEqual(1);
    });
});
