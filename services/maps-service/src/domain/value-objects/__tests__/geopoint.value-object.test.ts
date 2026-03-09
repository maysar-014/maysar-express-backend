/**
 * GeoPoint Value Object Tests - Maps Service
 *
 * Purpose: Validates geographical coordinate value object business logic
 * Scope: Domain layer testing with zero external dependencies
 * Coverage Target: 98% (critical business logic)
 * Constitution Section: 4.1 Domain Purity Rule - No external dependencies
 * 
 * Test Categories:
 * - Creation and validation (coordinate boundaries)
 * - Business rule enforcement (great-circle distance calculation)
 * - Mathematical operations (bearing, proximity detection)
 * - Edge cases (polar coordinates, antipodal points, date line)
 * 
 * Business Rules Covered:
 * - Latitude must be between -90 and 90 degrees
 * - Longitude must be between -180 and 180 degrees
 * - Address cannot be empty
 * - Distance calculations use great-circle formula
 * - Bearing calculations follow compass directions
 */

import { GeoPoint } from '../geopoint.value-object';

describe('GeoPoint Value Object', () => {
    describe('Creation and Validation', () => {
        describe('when creating with valid coordinates', () => {
            it('should create a valid GeoPoint with correct coordinates', () => {
                // Given: Valid geographical coordinates for Dar es Salaam
                const lat = -6.7924;
                const lng = 39.2083;
                const address = 'Dar es Salaam, Tanzania';

                // When: Creating a GeoPoint
                const geoPoint = GeoPoint.create(lat, lng, address);

                // Then: All properties should be correctly assigned
                expect(geoPoint.getLatitude()).toBe(lat);
                expect(geoPoint.getLongitude()).toBe(lng);
                expect(geoPoint.getAddress()).toBe(address);
                expect(geoPoint).toBeInstanceOf(GeoPoint);
            });

            it('should create with optional accuracy parameter', () => {
                // Given: Coordinates with specified accuracy
                const accuracy = 5; // 5 meters

                // When: Creating GeoPoint with accuracy
                const geoPoint = GeoPoint.create(-6.7924, 39.2083, 'Location', accuracy);

                // Then: Accuracy should be stored
                expect(geoPoint.getAccuracy()).toBe(accuracy);
            });
        });

        describe('when creating with invalid coordinates', () => {
            it('should throw error for latitude above maximum (90°)', () => {
                expect(() => GeoPoint.create(91, 39.2083, 'Invalid'))
                    .toThrow('Latitude must be between -90 and 90 degrees');
            });

            it('should throw error for latitude below minimum (-90°)', () => {
                expect(() => GeoPoint.create(-91, 39.2083, 'Invalid'))
                    .toThrow('Latitude must be between -90 and 90 degrees');
            });

            it('should throw error for longitude above maximum (180°)', () => {
                expect(() => GeoPoint.create(-6.7924, 181, 'Invalid'))
                    .toThrow('Longitude must be between -180 and 180 degrees');
            });

            it('should throw error for longitude below minimum (-180°)', () => {
                expect(() => GeoPoint.create(-6.7924, -181, 'Invalid'))
                    .toThrow('Longitude must be between -180 and 180 degrees');
            });

            it('should throw error for empty address', () => {
                expect(() => GeoPoint.create(-6.7924, 39.2083, ''))
                    .toThrow('Address cannot be empty');
            });
        });
    });

    describe('Distance Calculation - Great-Circle Formula', () => {
        describe('when calculating distance between two points', () => {
            it('should calculate correct distance for known city pair (Dar es Salaam to Arusha)', () => {
                // Given: Two major Tanzanian cities with known distance (~470 km)
                const darEsSalaam = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
                const arusha = GeoPoint.create(-3.3869, 36.6828, 'Arusha');

                // When: Calculating distance using great-circle formula
                const distance = darEsSalaam.distanceTo(arusha);

                // Then: Distance should be approximately 460-480 km (real-world verified)
                expect(distance).toBeGreaterThan(450);
                expect(distance).toBeLessThan(500);
            });

            it('should return 0 for identical points', () => {
                // Given: Same point referenced twice
                const point = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');

                // When: Calculating distance to self
                const distance = point.distanceTo(point);

                // Then: Distance should be exactly 0
                expect(distance).toBe(0);
            });

            it('should produce symmetric results (A to B equals B to A)', () => {
                // Given: Two distinct points
                const pointA = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
                const pointB = GeoPoint.create(-3.3869, 36.6828, 'Arusha');

                // When: Calculating distance in both directions
                const distanceAB = pointA.distanceTo(pointB);
                const distanceBA = pointB.distanceTo(pointA);

                // Then: Distances should be identical (mathematical invariant)
                expect(distanceAB).toBe(distanceBA);
            });

            it('should handle antipodal points (opposite sides of Earth)', () => {
                // Given: Two points on opposite sides of Earth
                const equatorPrime = GeoPoint.create(0, 0, 'Equator Prime Meridian');
                const antipode = GeoPoint.create(0, 180, 'Antipode');

                // When: Calculating distance
                const distance = equatorPrime.distanceTo(antipode);

                // Then: Should be approximately half Earth's circumference (~20,000 km)
                expect(distance).toBeGreaterThan(20000);
                expect(distance).toBeLessThan(21000);
            });
        });
    });

    describe('Bearing Calculation', () => {
        describe('when calculating bearing to another point', () => {
            it('should calculate bearing to north as 0°', () => {
                // Given: Origin point and a point directly north
                const origin = GeoPoint.create(0, 0, 'Origin');
                const north = GeoPoint.create(10, 0, 'North');

                // When: Calculating bearing
                const bearing = origin.bearingTo(north);

                // Then: Bearing should be approximately 0° (north)
                expect(bearing).toBeCloseTo(0, 1);
            });

            it('should calculate bearing to east as 90°', () => {
                // Given: Origin point and a point directly east
                const origin = GeoPoint.create(0, 0, 'Origin');
                const east = GeoPoint.create(0, 10, 'East');

                // When: Calculating bearing
                const bearing = origin.bearingTo(east);

                // Then: Bearing should be approximately 90° (east)
                expect(bearing).toBeCloseTo(90, 1);
            });
        });
    });

    describe('Proximity Detection', () => {
        describe('when checking if points are within radius', () => {
            it('should return true for points within specified radius', () => {
                // Given: Center point and nearby point (~12 km apart)
                const center = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam CBD');
                const nearby = GeoPoint.create(-6.8, 39.22, 'Msasani Peninsula');

                // When: Checking proximity with 20 km radius
                const isWithin = center.isWithinRadius(nearby, 20);

                // Then: Should return true
                expect(isWithin).toBe(true);
            });

            it('should return false for points outside specified radius', () => {
                // Given: Two points far apart (~470 km)
                const darEsSalaam = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
                const arusha = GeoPoint.create(-3.3869, 36.6828, 'Arusha');

                // When: Checking proximity with small radius
                const isWithin = darEsSalaam.isWithinRadius(arusha, 20);

                // Then: Should return false
                expect(isWithin).toBe(false);
            });
        });
    });

    describe('Value Object Equality', () => {
        describe('when comparing GeoPoint instances', () => {
            it('should return true for identical coordinates', () => {
                // Given: Two GeoPoints with same coordinates
                const point1 = GeoPoint.create(-6.7924, 39.2083, 'Location A');
                const point2 = GeoPoint.create(-6.7924, 39.2083, 'Location A');

                // When: Comparing for equality
                const areEqual = point1.equals(point2);

                // Then: Should be equal (value object property)
                expect(areEqual).toBe(true);
            });

            it('should return false for different coordinates', () => {
                // Given: Two GeoPoints with different coordinates
                const point1 = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');
                const point2 = GeoPoint.create(-3.3869, 36.6828, 'Arusha');

                // When: Comparing for equality
                const areEqual = point1.equals(point2);

                // Then: Should not be equal
                expect(areEqual).toBe(false);
            });

            it('should return true when comparing instance to itself', () => {
                // Given: Single GeoPoint instance
                const point = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');

                // When: Comparing to self
                const areEqual = point.equals(point);

                // Then: Should be equal (reflexive property)
                expect(areEqual).toBe(true);
            });
        });
    });

    describe('Immutability Guarantees', () => {
        it('should not expose setters for any properties', () => {
            // Given: A GeoPoint instance
            const point = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam');

            // When/Then: Should have getters but no setters (value object immutability)
            expect(point.getLatitude).toBeDefined();
            expect(point.getLongitude).toBeDefined();
            expect(point.getAddress).toBeDefined();
            expect((point as any).setLatitude).toBeUndefined();
            expect((point as any).setLongitude).toBeUndefined();
            expect((point as any).setAddress).toBeUndefined();
        });
    });

    describe('Edge Cases and Boundaries', () => {
        it('should handle North Pole (90° latitude)', () => {
            // Given: North Pole coordinates
            const northPole = GeoPoint.create(90, 0, 'North Pole');

            // When/Then: Should be created successfully
            expect(northPole.getLatitude()).toBe(90);
            expect(northPole.getLongitude()).toBe(0);
        });

        it('should handle South Pole (-90° latitude)', () => {
            // Given: South Pole coordinates
            const southPole = GeoPoint.create(-90, 0, 'South Pole');

            // When/Then: Should be created successfully
            expect(southPole.getLatitude()).toBe(-90);
            expect(southPole.getLongitude()).toBe(0);
        });

        it('should handle Prime Meridian (0° longitude)', () => {
            // Given: Location on Prime Meridian
            const greenwich = GeoPoint.create(51.4779, 0, 'Greenwich, London');

            // When/Then: Should be created successfully
            expect(greenwich.getLongitude()).toBe(0);
        });

        it('should handle International Date Line (180° longitude)', () => {
            // Given: Location on International Date Line
            const dateLine = GeoPoint.create(0, 180, 'International Date Line');

            // When/Then: Should be created successfully
            expect(dateLine.getLongitude()).toBe(180);
        });

        it('should handle Equator (0° latitude)', () => {
            // Given: Location on Equator
            const equator = GeoPoint.create(0, 103.8198, 'Singapore (near Equator)');

            // When/Then: Should be created successfully
            expect(equator.getLatitude()).toBe(0);
        });
    });
});
