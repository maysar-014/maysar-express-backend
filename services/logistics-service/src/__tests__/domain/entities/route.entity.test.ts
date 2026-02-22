import { Route } from '../../../domain/entities/route.entity';
import { RouteStatus } from '../../../domain/enums/route-status.enum';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';
import { RouteProgress } from '../../../domain/value-objects/route-progress.value-object';

describe('RouteEntity', () => {
    const origin = GeoPoint.create(0, 0, 'Origin');
    const dest = GeoPoint.create(1, 1, 'Dest');
    const waypoints = [origin, dest];

    const createRoute = (status?: RouteStatus) => Route.create({
        id: 'route-1',
        courierId: 'courier-1',
        status,
        totalDistance: 100,
        estimatedDuration: 60,
        waypoints
    });

    describe('Creation', () => {
        it('should create planned route by default', () => {
            const route = createRoute();
            expect(route.getStatus()).toBe(RouteStatus.PLANNED);
            expect(route.getProgress()).toBeDefined();
        });

        it('should validate required fields', () => {
            expect(() => Route.create({
                id: '',
                courierId: 'c-1',
                totalDistance: 100,
                estimatedDuration: 60,
                waypoints
            })).toThrow('Route ID is required');

            expect(() => Route.create({
                id: 'r-1',
                courierId: 'c-1',
                totalDistance: -1,
                estimatedDuration: 60,
                waypoints
            })).toThrow('Total distance cannot be negative');
        });
    });

    describe('State Transitions', () => {
        it('should assign planned route', () => {
            const route = createRoute(RouteStatus.PLANNED);
            const assigned = route.assignToCourier();
            expect(assigned.getStatus()).toBe(RouteStatus.ASSIGNED);
        });

        it('should fail assigning already assigned route', () => {
            const route = createRoute(RouteStatus.ASSIGNED);
            expect(() => route.assignToCourier()).toThrow(/Only planned routes/);
        });

        it('should start route', () => {
            const route = createRoute(RouteStatus.ASSIGNED);
            const started = route.startRoute();
            expect(started.getStatus()).toBe(RouteStatus.IN_PROGRESS);
        });

        it('should complete route', () => {
            const route = createRoute(RouteStatus.IN_PROGRESS);
            // Must mock progress completion first if enforced
            // The entity checks this.progress.isCompleted()
            // We need to update progress to completed state
            const completedProgress = RouteProgress.create(2, 2, dest, new Date());
            const progressingRoute = route.updateProgress(completedProgress);

            const completed = progressingRoute.completeRoute(55);
            expect(completed.getStatus()).toBe(RouteStatus.COMPLETED);
            expect(completed.getActualDuration()).toBe(55);
            expect(completed.getCompletedAt()).toBeDefined();
        });

        it('should cancel route', () => {
            const route = createRoute(RouteStatus.PLANNED);
            const cancelled = route.cancelRoute();
            expect(cancelled.getStatus()).toBe(RouteStatus.CANCELLED);
        });
    });

    describe('Progress & Calculations', () => {
        it('should calculate remaining distance', () => {
            // Mock distanceTo logic implies we need real GeoPoints working
            // 0,0 to 1,1 is roughly 157km
            const route = createRoute();
            const remaining = route.getRemainingDistance();
            expect(remaining).toBeGreaterThan(0);
        });
    });
});
