import { HereRoutingAdapter } from '../here-maps.adapter';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

global.fetch = jest.fn();

describe('HereRoutingAdapter', () => {
    let adapter: HereRoutingAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new HereRoutingAdapter('test-key');
    });

    it('requires an API key', () => {
        expect(() => new HereRoutingAdapter('')).toThrow('HERE_API_KEY is required');
    });

    describe('calculateOptimalRoute', () => {
        it('should calculate route successfully', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    routes: [{
                        summary: {
                            length: 10000,
                            duration: 1200
                        }
                    }]
                })
            });

            const origin = GeoPoint.create(-1.286389, 36.817223, 'Origin');
            const dest = GeoPoint.create(-1.292066, 36.821946, 'Dest');

            const result = await adapter.calculateOptimalRoute(origin, dest);

            expect(result.totalDistance).toBeGreaterThan(0);
            expect(result.segments.length).toBeGreaterThan(0);
        });

        it('should throw when API fails', async () => {
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const origin = GeoPoint.create(-1.286389, 36.817223, 'Origin');
            const dest = GeoPoint.create(-1.292066, 36.821946, 'Dest');

            await expect(adapter.calculateOptimalRoute(origin, dest)).rejects.toThrow('Network error');
        });
    });

    describe('calculateMultiStopRoute', () => {
        it('should calculate multi-stop route', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    routes: [{
                        summary: {
                            length: 15000,
                            duration: 1800
                        }
                    }]
                })
            });

            const waypoints = [
                GeoPoint.create(-1.286389, 36.817223, 'A'),
                GeoPoint.create(-1.289, 36.82, 'B'),
                GeoPoint.create(-1.292066, 36.821946, 'C')
            ];

            const result = await adapter.calculateMultiStopRoute(waypoints);

            expect(result.waypoints.length).toBe(3);
        });

        it('should throw error for insufficient waypoints', async () => {
            const waypoints = [GeoPoint.create(-1.286389, 36.817223, 'A')];

            await expect(adapter.calculateMultiStopRoute(waypoints)).rejects.toThrow();
        });
    });

    describe('getRouteAlternatives', () => {
        it('should return multiple alternatives', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    routes: [
                        { summary: { length: 10000, duration: 1200 } },
                        { summary: { length: 12000, duration: 1300 } },
                        { summary: { length: 14000, duration: 1500 } }
                    ]
                })
            });

            const origin = GeoPoint.create(-1.286389, 36.817223, 'Origin');
            const dest = GeoPoint.create(-1.292066, 36.821946, 'Dest');

            const result = await adapter.getRouteAlternatives(origin, dest, 3);

            expect(result.length).toBe(3);
        });
    });

    describe('validateRoute', () => {
        it('should validate valid route', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    routes: [{
                        summary: { length: 10000, duration: 1200 }
                    }]
                })
            });

            const route = [
                GeoPoint.create(-1.286389, 36.817223, 'A'),
                GeoPoint.create(-1.292066, 36.821946, 'B')
            ];

            const result = await adapter.validateRoute(route);

            expect(result.isValid).toBe(true);
        });

        it('should reject route with insufficient points', async () => {
            const route = [GeoPoint.create(-1.286389, 36.817223, 'A')];
            const result = await adapter.validateRoute(route);
            expect(result.isValid).toBe(false);
        });
    });
});
