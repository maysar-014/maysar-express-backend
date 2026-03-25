import { CapacityRepository } from './CapacityRepository';

describe('CapacityRepository', () => {
    const snapshots = new Map<string, any>();

    const toKey = (supplierId: string, date: Date) => `${supplierId}:${date.toISOString()}`;

    const prisma = {
        production_CapacitySnapshot: {
            findUnique: jest.fn(async ({ where }: any) =>
                snapshots.get(toKey(where.supplierId_date.supplierId, where.supplierId_date.date)) ?? null
            ),
            findFirst: jest.fn(async ({ where }: any) =>
                Array.from(snapshots.values())
                    .filter((snapshot) => snapshot.supplierId === where.supplierId)
                    .sort((left, right) => Date.parse(right.date.toISOString()) - Date.parse(left.date.toISOString()))[0] ?? null
            ),
            upsert: jest.fn(async ({ where, update, create }: any) => {
                const key = toKey(where.supplierId_date.supplierId, where.supplierId_date.date);
                const existing = snapshots.get(key);
                const record = existing
                    ? {
                        ...existing,
                        ...update,
                        updatedAt: new Date('2026-03-23T08:10:00.000Z')
                    }
                    : {
                        ...create,
                        createdAt: new Date('2026-03-23T08:10:00.000Z'),
                        updatedAt: new Date('2026-03-23T08:10:00.000Z')
                    };
                snapshots.set(key, record);
                return record;
            })
        }
    };

    let repository: CapacityRepository;

    beforeEach(() => {
        snapshots.clear();
        jest.clearAllMocks();

        snapshots.set('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV:2026-03-23T00:00:00.000Z', {
            id: 'prd_capsna_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            date: new Date('2026-03-23T00:00:00.000Z'),
            maxCapacity: 10000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            unit: 'units',
            adjustedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            reason: 'Initial production planning baseline',
            createdAt: new Date('2026-03-23T08:00:00.000Z'),
            updatedAt: new Date('2026-03-23T08:00:00.000Z')
        });

        repository = new CapacityRepository(prisma as never);
    });

    it('returns the seeded supplier capacity snapshot', async () => {
        const snapshot = await repository.getSnapshot('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', new Date('2026-03-23T00:00:00.000Z'));

        expect(snapshot.maxCapacity).toBe(10000);
        expect(snapshot.availableCapacity).toBe(5000);
    });

    it('updates and returns the latest supplier capacity snapshot', async () => {
        const snapshot = await repository.updateSnapshot({
            supplierId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV',
            maxCapacity: 12000,
            usedCapacity: 3500,
            reservedCapacity: 1500,
            unit: 'units',
            reason: 'Planner override',
            adjustedBy: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV'
        });

        expect(snapshot.maxCapacity).toBe(12000);
        expect(snapshot.availableCapacity).toBe(7000);
    });
});
