/**
 * Maps Service Application Layer Tests
 *
 * Purpose: Validates Maps Service orchestration logic and provider coordination
 * Scope: Application layer - use case wedding and service coordination
 * Coverage Target: 90% (application orchestration)
 * Constitution Section: Application Layer Testing - Mock external ports only
 * 
 * Test Categories:
 * - Route calculation delegation
 * - Location tracking coordination  
 * - Conditional data aggregation (traffic + weather)
 * - ETA calculation orchestration
 * 
 * Business Rules Covered:
 * - MapsService delegates to appropriate providers
 * - Parameters are passed through correctly
 * - Multiple provider calls are coordinated properly
 * - Constraints are respected and forwarded
 */

import { MapsService } from '../../services/maps.service';
import { RoutingPort } from '../../../domain/engines/ports/routing.port';
import { TrackingPort } from '../../../domain/engines/ports/tracking.port';
import { TrafficPort } from '../../../domain/engines/ports/traffic.port';
import { WeatherPort } from '../../../domain/engines/ports/weather.port';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';

describe('MapsService - Application Orchestration', () => {
    let mapsService: MapsService;
    let mockRoutingProvider: jest.Mocked<RoutingPort>;
    let mockTrackingProvider: jest.Mocked<TrackingPort>;
    let mockTrafficProvider: jest.Mocked<TrafficPort>;
    let mockWeatherProvider: jest.Mocked<WeatherPort>;

    const testOrigin = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam CBD');
    const testDestination = GeoPoint.create(-6.8167, 39.2833, 'Msasani Peninsula');

    beforeEach(() => {
        // Given: Mocked infrastructure providers (Constitution allows mocking external ports)
        mockRoutingProvider = {
            calculateOptimalRoute: jest.fn(),
            calculateMultiStopRoute: jest.fn(),
            getRouteAlternatives: jest.fn(),
            validateRoute: jest.fn()
        } as any;

        mockTrackingProvider = {
            storeLocationUpdate: jest.fn(),
            getCourierLocation: jest.fn(),
            getDeliveryTracking: jest.fn(),
            getLocationHistory: jest.fn(),
            calculateETA: jest.fn(),
            detectAnomalies: jest.fn()
        } as any;

        mockTrafficProvider = {
            getConditions: jest.fn(),
            getRouteTraffic: jest.fn(),
            predictTraffic: jest.fn()
        } as any;

        mockWeatherProvider = {
            getCurrentWeather: jest.fn(),
            getForecast: jest.fn()
        } as any;

        mapsService = new MapsService(
            mockRoutingProvider,
            mockTrackingProvider,
            mockTrafficProvider,
            mockWeatherProvider
        );
    });

    describe('Route Calculation Orchestration', () => {
        describe('when calculating optimal route', () => {
            it('should delegate to routing provider with correct parameters', async () => {
                // Given: Expected route result from provider
                const mockRoute = {
                    segments: [],
                    totalDistance: 10.5,
                    totalDuration: 20,
                    waypoints: [testOrigin, testDestination],
                    efficiency: 85,
                    confidence: 0.92,
                    alternatives: []
                };
                mockRoutingProvider.calculateOptimalRoute.mockResolvedValue(mockRoute);

                // When: Requesting optimal route
                const result = await mapsService.getOptimalRoute(testOrigin, testDestination);

                // Then: Should delegate to provider and return result
                expect(result).toEqual(mockRoute);
                expect(mockRoutingProvider.calculateOptimalRoute).toHaveBeenCalledWith(
                    testOrigin,
                    testDestination,
                    undefined
                );
                expect(mockRoutingProvider.calculateOptimalRoute).toHaveBeenCalledTimes(1);
            });

            it('should forward route constraints to routing provider', async () => {
                // Given: Route constraints
                const constraints = {
                    avoidHighways: true,
                    avoidTolls: true,
                    priority: 'fastest' as const
                };
                mockRoutingProvider.calculateOptimalRoute.mockResolvedValue({} as any);

                // When: Requesting route with constraints
                await mapsService.getOptimalRoute(testOrigin, testDestination, constraints);

                // Then: Constraints should be passed to provider
                expect(mockRoutingProvider.calculateOptimalRoute).toHaveBeenCalledWith(
                    testOrigin,
                    testDestination,
                    constraints
                );
            });

            it('should preserve route calculation results without modification', async () => {
                // Given: Complex route with multiple segments
                const complexRoute = {
                    segments: [
                        {
                            start: testOrigin,
                            end: GeoPoint.create(-6.8, 39.25, 'Midpoint'),
                            distance: 5.2,
                            duration: 10,
                            roadType: 'highway' as const,
                            trafficLevel: 60
                        }
                    ],
                    totalDistance: 5.2,
                    totalDuration: 10,
                    baseDuration: 8,
                    trafficDelay: 2,
                    waypoints: [testOrigin, testDestination],
                    efficiency: 92,
                    confidence: 0.95,
                    alternatives: []
                };
                mockRoutingProvider.calculateOptimalRoute.mockResolvedValue(complexRoute);

                // When: Calculating route
                const result = await mapsService.getOptimalRoute(testOrigin, testDestination);

                // Then: Result should match provider output exactly
                expect(result).toEqual(complexRoute);
                expect(result.baseDuration).toBe(8);
                expect(result.trafficDelay).toBe(2);
            });
        });
    });

    describe('Location Tracking Coordination', () => {
        describe('when updating courier location', () => {
            it('should store location update via tracking provider', async () => {
                // Given: Location update with full metadata
                const locationUpdate = {
                    courierId: 'courier-123',
                    deliveryId: 'delivery-456',
                    location: testOrigin,
                    speed: 35,
                    heading: 90,
                    timestamp: new Date('2024-01-15T10:30:00Z'),
                    batteryLevel: 85,
                    accuracy: 5
                };

                // When: Updating location
                await mapsService.updateLocation(locationUpdate);

                // Then: Should delegate to tracking provider
                expect(mockTrackingProvider.storeLocationUpdate).toHaveBeenCalledWith(locationUpdate);
                expect(mockTrackingProvider.storeLocationUpdate).toHaveBeenCalledTimes(1);
            });

            it('should handle location updates without optional metadata', async () => {
                // Given: Minimal location update
                const minimalUpdate = {
                    courierId: 'courier-789',
                    deliveryId: 'delivery-012',
                    location: testDestination,
                    speed: 0,
                    heading: 0,
                    timestamp: new Date()
                };

                // When: Updating with minimal data
                await mapsService.updateLocation(minimalUpdate);

                // Then: Should still process correctly
                expect(mockTrackingProvider.storeLocationUpdate).toHaveBeenCalledWith(minimalUpdate);
            });
        });

        describe('when retrieving courier location', () => {
            it('should delegate to tracking provider and return location', async () => {
                // Given: Tracked courier location
                const expectedLocation = testOrigin;
                mockTrackingProvider.getCourierLocation.mockResolvedValue(expectedLocation);

                // When: Getting courier location
                const result = await mapsService.getCourierLocation('courier-123');

                // Then: Should return provider result
                expect(result).toEqual(expectedLocation);
                expect(mockTrackingProvider.getCourierLocation).toHaveBeenCalledWith('courier-123');
            });

            it('should return null for unknown courier', async () => {
                // Given: Unknown courier
                mockTrackingProvider.getCourierLocation.mockResolvedValue(null);

                // When: Getting unknown courier location
                const result = await mapsService.getCourierLocation('unknown-courier');

                // Then: Should return null
                expect(result).toBeNull();
            });
        });
    });

    describe('Area Conditions Aggregation', () => {
        describe('when fetching combined traffic and weather data', () => {
            it('should fetch both traffic and weather conditions in parallel', async () => {
                // Given: Mock traffic and weather data
                const mockTraffic = {
                    level: 'moderate' as const,
                    delayMinutes: 10,
                    incidents: [],
                    averageSpeed: 45
                };
                const mockWeather = {
                    temperature: 28,
                    condition: 'clear' as const,
                    visibility: 10,
                    precipitationProbability: 5,
                    windSpeed: 12
                };
                mockTrafficProvider.getConditions.mockResolvedValue(mockTraffic);
                mockWeatherProvider.getCurrentWeather.mockResolvedValue(mockWeather);

                // When: Getting area conditions
                const result = await mapsService.getAreaConditions(testOrigin);

                // Then: Should return both traffic and weather
                expect(result).toEqual({
                    traffic: mockTraffic,
                    weather: mockWeather
                });
                expect(mockTrafficProvider.getConditions).toHaveBeenCalledWith(testOrigin, 5);
                expect(mockWeatherProvider.getCurrentWeather).toHaveBeenCalledWith(testOrigin);
            });

            it('should use standard radius for traffic conditions (5 km)', async () => {
                // Given: Mocked providers
                mockTrafficProvider.getConditions.mockResolvedValue({} as any);
                mockWeatherProvider.getCurrentWeather.mockResolvedValue({} as any);

                // When: Getting conditions
                await mapsService.getAreaConditions(testOrigin);

                // Then: Should use 5km radius for traffic
                expect(mockTrafficProvider.getConditions).toHaveBeenCalledWith(testOrigin, 5);
            });

            it('should handle traffic and weather data independently', async () => {
                // Given: Different severity levels
                const heavyTraffic = {
                    level: 'heavy' as const,
                    delayMinutes: 25,
                    incidents: [{ type: 'accident', location: testOrigin }],
                    averageSpeed: 20
                };
                const badWeather = {
                    temperature: 18,
                    condition: 'rain' as const,
                    visibility: 5,
                    precipitationProbability: 90,
                    windSpeed: 25
                };
                mockTrafficProvider.getConditions.mockResolvedValue(heavyTraffic);
                mockWeatherProvider.getCurrentWeather.mockResolvedValue(badWeather);

                // When: Getting conditions in poor conditions
                const result = await mapsService.getAreaConditions(testOrigin);

                // Then: Both should be reflected accurately
                expect(result.traffic.level).toBe('heavy');
                expect(result.weather.condition).toBe('rain');
                expect(result.weather.precipitationProbability).toBe(90);
            });
        });
    });

    describe('ETA Calculation Delegation', () => {
        describe('when calculating estimated time of arrival', () => {
            it('should delegate to tracking provider with correct parameters', async () => {
                // Given: Expected ETA in minutes
                const expectedETA = 15;
                mockTrackingProvider.calculateETA.mockResolvedValue(expectedETA);

                // When: Calculating ETA
                const result = await mapsService.getETA('delivery-123', testOrigin);

                // Then: Should return provider result
                expect(result).toBe(expectedETA);
                expect(mockTrackingProvider.calculateETA).toHaveBeenCalledWith('delivery-123', testOrigin);
            });

            it('should handle variable ETA values', async () => {
                // Given: Different ETA scenarios
                const etaValues = [5, 15, 30, 45, 60];

                for (const eta of etaValues) {
                    mockTrackingProvider.calculateETA.mockResolvedValue(eta);

                    // When: Calculating ETA
                    const result = await mapsService.getETA(`delivery-${eta}`, testOrigin);

                    // Then: Should return accurate ETA
                    expect(result).toBe(eta);
                }
            });
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should propagate provider errors to caller', async () => {
            // Given: Provider that fails
            mockRoutingProvider.calculateOptimalRoute.mockRejectedValue(
                new Error('External API unavailable')
            );

            // When/Then: Should propagate error
            await expect(
                mapsService.getOptimalRoute(testOrigin, testDestination)
            ).rejects.toThrow('External API unavailable');
        });

        it('should handle concurrent requests independently', async () => {
            // Given: Multiple concurrent requests
            mockRoutingProvider.calculateOptimalRoute.mockResolvedValue({} as any);

            // When: Making concurrent requests
            const promises = [
                mapsService.getOptimalRoute(testOrigin, testDestination),
                mapsService.getOptimalRoute(testDestination, testOrigin)
            ];

            await Promise.all(promises);

            // Then: All requests should be processed
            expect(mockRoutingProvider.calculateOptimalRoute).toHaveBeenCalledTimes(2);
        });
    });
});
