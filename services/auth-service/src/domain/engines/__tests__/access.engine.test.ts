import { AccessEngine, AccessRequest } from '../access.engine';

// Mock Redis
const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    pipeline: jest.fn().mockReturnThis(),
    exec: jest.fn()
};

// Mock DB
const mockDb = {
    getRolePermissions: jest.fn()
};

describe('AccessEngine', () => {
    let engine: AccessEngine;

    beforeEach(() => {
        engine = new AccessEngine();
        (engine as any).redis = mockRedis;
        (engine as any).db = mockDb;
        jest.clearAllMocks();
    });

    describe('checkAccess', () => {
        const request: AccessRequest = {
            userId: 'user-1',
            role: 'buyer',
            resource: 'products',
            action: 'view'
        };

        it('should return cached result if available', async () => {
            const cachedResult = { granted: true, permissions: ['view'], confidence: 1 };
            mockRedis.get.mockResolvedValue(JSON.stringify(cachedResult));

            const result = await engine.checkAccess(request);
            expect(result).toEqual(cachedResult);
            expect(mockRedis.get).toHaveBeenCalledWith(`access:${request.userId}:${request.resource}:${request.action}`);
        });

        it('should fetch permissions and calculate access if not cached', async () => {
            mockRedis.get.mockResolvedValue(null);
            mockDb.getRolePermissions.mockResolvedValue({ products: ['view'] });

            const result = await engine.checkAccess(request);

            expect(result.granted).toBe(true);
            expect(result.permissions).toContain('view');
            expect(mockRedis.setex).toHaveBeenCalled();
        });

        it('should deny access if permission missing', async () => {
            mockRedis.get.mockResolvedValue(null);
            mockDb.getRolePermissions.mockResolvedValue({ products: ['view'] });

            const result = await engine.checkAccess({ ...request, action: 'delete' });

            expect(result.granted).toBe(false);
        });

        it('should grant access for wildcard permissions', async () => {
            mockRedis.get.mockResolvedValue(null);
            mockDb.getRolePermissions.mockResolvedValue({ products: ['*'] });

            const result = await engine.checkAccess({ ...request, action: 'delete' });

            expect(result.granted).toBe(true);
        });
    });

    describe('bulkCheckAccess', () => {
        it('should handle bulk requests efficiently', async () => {
            const requests = [
                { userId: 'u1', role: 'buyer', resource: 'res1', action: 'act1' },
                { userId: 'u2', role: 'seller', resource: 'res2', action: 'act2' }
            ];

            // Mock piepline results: first cached, second miss
            mockRedis.exec.mockResolvedValue([
                [null, JSON.stringify({ granted: true })], // cached
                [null, null] // miss
            ]);

            // Mock single check for miss
            jest.spyOn(engine, 'checkAccess').mockResolvedValue({ granted: false } as any);

            const results = await engine.bulkCheckAccess(requests);

            expect(results).toHaveLength(2);
            expect(results[0].granted).toBe(true);
            expect(results[1].granted).toBe(false);
        });
    });
});
