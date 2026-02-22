import { GoogleMapsRoutingAdapter } from '../google-maps.adapter';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

global.fetch = jest.fn();

describe('GoogleMapsRoutingAdapter', () => {
    let adapter: GoogleMapsRoutingAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        adapter = new GoogleMapsRoutingAdapter('test-key');
    });

    describe('calculateOptimalRoute', () => {
        it('should calculate route successfully', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'OK',
                    routes: [{
                        legs: [{
                            distance: { value: 10000, text: '10 km' },
                            duration: { value: 1200, text: '20 min' },
                            steps: [{
                                distance: { value: 10000, text: '10 km' },
                                duration: { value: 1200, text: '20 min' },
                                start_location: { lat: -1.286389, lng: 36.817223 },
                                end_location: { lat: -1.292066, lng: 36.821946 },
                                html_instructions: 'Head north',
                                travel_mode: 'DRIVING'
                            }]
                        }],
                        overview_polyline: { points: 'test' },
                        bounds: {
                            northeast: { lat: -1.286389, lng: 36.821946 },
                            southwest: { lat: -1.292066, lng: 36.817223 }
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

        it('should handle API errors', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'ZERO_RESULTS' })
            });

            const origin = GeoPoint.create(-1.286389, 36.817223, 'Origin');
            const dest = GeoPoint.create(-1.292066, 36.821946, 'Dest');

            await expect(adapter.calculateOptimalRoute(origin, dest)).rejects.toThrow();
        });
    });

    describe('calculateMultiStopRoute', () => {
        it('should calculate multi-stop route', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'OK',
                    routes: [{
                        legs: [{
                            distance: { value: 5000, text: '5 km' },
                            duration: { value: 600, text: '10 min' },
                            steps: [{
                                distance: { value: 5000, text: '5 km' },
                                duration: { value: 600, text: '10 min' },
                                start_location: { lat: -1.286389, lng: 36.817223 },
                                end_location: { lat: -1.289, lng: 36.82 },
                                html_instructions: 'Head north',
                                travel_mode: 'DRIVING'
                            }]
                        }]
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
    });

    describe('getRouteAlternatives', () => {
        it('should return multiple route alternatives', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'OK',
                    routes: [{
                        legs: [{
                            distance: { value: 10000, text: '10 km' },
                            duration: { value: 1200, text: '20 min' },
                            steps: [{
                                distance: { value: 10000, text: '10 km' },
                                duration: { value: 1200, text: '20 min' },
                                start_location: { lat: -1.286389, lng: 36.817223 },
                                end_location: { lat: -1.292066, lng: 36.821946 },
                                html_instructions: 'Head north',
                                travel_mode: 'DRIVING'
                            }]
                        }]
                    }]
                })
            });

            const origin = GeoPoint.create(-1.286389, 36.817223, 'Origin');
            const dest = GeoPoint.create(-1.292066, 36.821946, 'Dest');

            const result = await adapter.getRouteAlternatives(origin, dest, 2);

            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('validateRoute', () => {
        it('should validate valid route', async () => {
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    status: 'OK',
                    routes: [{
                        legs: [{
                            distance: { value: 10000, text: '10 km' },
                            duration: { value: 1200, text: '20 min' },
                            steps: [{
                                distance: { value: 10000, text: '10 km' },
                                duration: { value: 1200, text: '20 min' },
                                start_location: { lat: -1.286389, lng: 36.817223 },
                                end_location: { lat: -1.292066, lng: 36.821946 },
                                html_instructions: 'Head north',
                                travel_mode: 'DRIVING'
                            }]
                        }]
                    }]
                })
            });

            const route = [
                GeoPoint.create(-1.286389, 36.817223, 'A'),
                GeoPoint.create(-1.292066, 36.821946, 'B')
            ];

            const result = await adapter.validateRoute(route);

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should reject route with less than 2 points', async () => {
            const route = [GeoPoint.create(-1.286389, 36.817223, 'A')];

            const result = await adapter.validateRoute(route);

            expect(result.isValid).toBe(false);
            expect(result.issues.length).toBeGreaterThan(0);
        });
    });
});
