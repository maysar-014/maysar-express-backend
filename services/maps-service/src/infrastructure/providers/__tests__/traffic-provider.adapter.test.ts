import { TrafficProviderAdapter } from '../traffic-provider.adapter';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

global.fetch = jest.fn();

describe('TrafficProviderAdapter', () => {
    let adapter: TrafficProviderAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new TrafficProviderAdapter('test-key');
    });

    describe('getConditions', () => {
        it('should fetch traffic conditions', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    routes: [{
                        legs: [{
                            duration: { value: 600 },
                            duration_in_traffic: { value: 900 },
                            distance: { value: 10000 }
                        }]
                    }]
                })
            });

            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const result = await adapter.getConditions(location, 5);

            expect(result.level).toBeDefined();
            expect(result.averageSpeed).toBeGreaterThan(0);
        });

        it('should use fallback on error', async () => {
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const result = await adapter.getConditions(location, 5);

            expect(result.level).toBeDefined();
        });
    });

    describe('getRouteTraffic', () => {
        it('should get traffic for route', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    routes: [{
                        legs: [{
                            duration: { value: 600 },
                            duration_in_traffic: { value: 720 },
                            distance: { value: 10000 }
                        }]
                    }]
                })
            });

            const route = [
                GeoPoint.create(-1.286389, 36.817223, 'A'),
                GeoPoint.create(-1.292066, 36.821946, 'B')
            ];

            const result = await adapter.getRouteTraffic(route);

            expect(result.level).toBeDefined();
        });
    });

    describe('predictTraffic', () => {
        it('should predict traffic', async () => {
            const location = GeoPoint.create(-1.286389, 36.817223, 'Test');
            const result = await adapter.predictTraffic(location, new Date());

            expect(result.level).toBeDefined();
        });
    });
});
