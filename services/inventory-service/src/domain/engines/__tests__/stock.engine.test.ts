import { StockEngine } from '../stock.engine';

const createPipeline = () => ({
    hgetall: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    exec: jest.fn()
});

describe('StockEngine', () => {
    let engine: StockEngine;
    let mockRedis: any;
    let mockRedisLock: any;
    let mockPipeline: any;

    beforeEach(() => {
        mockPipeline = createPipeline();
        mockRedis = {
            get: jest.fn(),
            setex: jest.fn(),
            hgetall: jest.fn().mockResolvedValue({ totalStock: '0', reorderLevel: '0' }),
            hincrby: jest.fn(),
            incrby: jest.fn(),
            decrby: jest.fn(),
            zadd: jest.fn(),
            zrem: jest.fn(),
            del: jest.fn(),
            lpush: jest.fn(),
            ltrim: jest.fn(),
            keys: jest.fn(),
            zrangebyscore: jest.fn(),
            zremrangebyscore: jest.fn(),
            lrange: jest.fn(),
            pipeline: jest.fn(() => mockPipeline)
        };
        mockRedisLock = {
            withLock: jest.fn(async (_key: string, fn: () => Promise<any>) => fn())
        };
        engine = new StockEngine(mockRedis, mockRedisLock);
        jest.clearAllMocks();
    });

    describe('checkAvailability', () => {
        it('should calculate available stock correctly', async () => {
            mockRedis.hgetall.mockResolvedValue({ totalStock: '100', reorderLevel: '10' });
            mockRedis.get.mockResolvedValue('20');

            const result = await engine.checkAvailability('prod-1', 5);

            expect(result.totalStock).toBe(100);
            expect(result.reservedStock).toBe(20);
            expect(result.availableStock).toBe(80);
            expect(result.needsReorder).toBe(false);
        });

        it('should flag reorder needed', async () => {
            mockRedis.hgetall.mockResolvedValue({ totalStock: '15', reorderLevel: '10' });
            mockRedis.get.mockResolvedValue('10');

            const result = await engine.checkAvailability('prod-1', 5);

            expect(result.availableStock).toBe(5);
            expect(result.needsReorder).toBe(true);
        });

        it('should handle zero stock', async () => {
            mockRedis.hgetall.mockResolvedValue({ totalStock: '0', reorderLevel: '10' });
            mockRedis.get.mockResolvedValue('0');

            const result = await engine.checkAvailability('prod-1', 5);

            expect(result.availableStock).toBe(0);
            expect(result.needsReorder).toBe(true);
        });
    });

    describe('reserveStock', () => {
        it('should reserve stock if available', async () => {
            mockRedis.hgetall.mockResolvedValue({ totalStock: '100', reorderLevel: '10' });
            mockRedis.get.mockResolvedValue('0');

            const reservation = await engine.reserveStock('prod-1', 5, 'order-1');

            expect(reservation.quantity).toBe(5);
            expect(reservation.status).toBe('active');
            expect(mockRedis.setex).toHaveBeenCalled();
            expect(mockRedis.incrby).toHaveBeenCalledWith('reserved:prod-1', 5);
        });

        it('should throw if insufficient stock', async () => {
            mockRedis.hgetall.mockResolvedValue({ totalStock: '10', reorderLevel: '0' });
            mockRedis.get.mockResolvedValue('8');

            await expect(engine.reserveStock('prod-1', 5, 'order-1')).rejects.toThrow('Insufficient stock');
        });

        it('should generate unique reservation id', async () => {
            mockRedis.hgetall.mockResolvedValue({ totalStock: '100', reorderLevel: '10' });
            mockRedis.get.mockResolvedValue('0');

            const res1 = await engine.reserveStock('prod-1', 5, 'order-1');
            const res2 = await engine.reserveStock('prod-1', 5, 'order-2');

            expect(res1.reservationId).not.toBe(res2.reservationId);
        });
    });

    describe('confirmReservation', () => {
        it('should confirm active reservation', async () => {
            const reservation = {
                reservationId: 'res-1',
                productVariantId: 'prod-1',
                quantity: 5,
                status: 'active'
            };
            mockRedis.get.mockResolvedValue(JSON.stringify(reservation));

            const result = await engine.confirmReservation('res-1');

            expect(result).toBe(true);
            expect(mockRedis.hincrby).toHaveBeenCalledWith('stock:prod-1', 'totalStock', -5);
            expect(mockRedis.decrby).toHaveBeenCalledWith('reserved:prod-1', 5);
        });

        it('should fail for non-active reservation', async () => {
            mockRedis.get.mockResolvedValue(JSON.stringify({ status: 'fulfilled' }));
            const result = await engine.confirmReservation('res-1');
            expect(result).toBe(false);
        });

        it('should fail for non-existent reservation', async () => {
            mockRedis.get.mockResolvedValue(null);
            const result = await engine.confirmReservation('res-999');
            expect(result).toBe(false);
        });
    });

    describe('releaseReservation', () => {
        it('should release active reservation', async () => {
            const reservation = {
                reservationId: 'res-1',
                productVariantId: 'prod-1',
                quantity: 5,
                status: 'active'
            };
            mockRedis.get.mockResolvedValue(JSON.stringify(reservation));

            const result = await engine.releaseReservation('res-1');

            expect(result).toBe(true);
            expect(mockRedis.decrby).toHaveBeenCalledWith('reserved:prod-1', 5);
            expect(mockRedis.del).toHaveBeenCalled();
        });

        it('should fail for non-active reservation', async () => {
            mockRedis.get.mockResolvedValue(JSON.stringify({ status: 'fulfilled' }));
            const result = await engine.releaseReservation('res-1');
            expect(result).toBe(false);
        });
    });

    describe('bulkCheckAvailability', () => {
        it('should check multiple products', async () => {
            mockPipeline.exec.mockResolvedValue([
                [null, { totalStock: '100', reorderLevel: '10' }],
                [null, '20'],
                [null, { totalStock: '50', reorderLevel: '5' }],
                [null, '10']
            ]);

            const result = await engine.bulkCheckAvailability([
                { productVariantId: 'prod-1', quantity: 5 },
                { productVariantId: 'prod-2', quantity: 3 }
            ]);

            expect(result).toHaveLength(2);
            expect(result[0].availableStock).toBe(80);
            expect(result[1].availableStock).toBe(40);
        });
    });

    describe('cleanupExpiredReservations', () => {
        it('should cleanup expired reservations', async () => {
            mockRedis.keys.mockResolvedValue(['reservations:prod-1']);
            mockRedis.zrangebyscore.mockResolvedValue(['res-1', 'res-2']);
            mockRedis.get.mockImplementation((key: string) => {
                const reservations: Record<string, string> = {
                    'reservation:res-1': JSON.stringify({ reservationId: 'res-1', productVariantId: 'prod-1', quantity: 5, status: 'active' }),
                    'reservation:res-2': JSON.stringify({ reservationId: 'res-2', productVariantId: 'prod-1', quantity: 3, status: 'active' })
                };
                return Promise.resolve(reservations[key] || null);
            });

            const count = await engine.cleanupExpiredReservations();

            expect(count).toBe(2);
            expect(mockRedis.decrby).toHaveBeenCalledTimes(2);
        });
    });

    describe('updateStock', () => {
        it('should update stock quantity', async () => {
            await engine.updateStock('prod-1', 10);
            expect(mockRedis.hincrby).toHaveBeenCalledWith('stock:prod-1', 'totalStock', 10);
        });

        it('should handle negative updates', async () => {
            await engine.updateStock('prod-1', -5);
            expect(mockRedis.hincrby).toHaveBeenCalledWith('stock:prod-1', 'totalStock', -5);
        });
    });

    describe('getStockMovementHistory', () => {
        it('should return movement history', async () => {
            const movements = [
                JSON.stringify({ productVariantId: 'prod-1', quantity: 10, type: 'inbound' }),
                JSON.stringify({ productVariantId: 'prod-1', quantity: -5, type: 'outbound' })
            ];
            mockRedis.lrange.mockResolvedValue(movements);

            const result = await engine.getStockMovementHistory('prod-1', 10);

            expect(result).toHaveLength(2);
            expect(result[0].quantity).toBe(10);
        });
    });
});
