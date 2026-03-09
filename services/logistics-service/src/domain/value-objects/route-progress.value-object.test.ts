import { GeoPoint } from './geopoint.value-object';
import { RouteProgress } from './route-progress.value-object';

describe('RouteProgress', () => {
  const currentLocation = GeoPoint.create(-6.79, 39.2, 'Current');

  it('creates valid progress and computes derived metrics', () => {
    const progress = RouteProgress.create(
      2,
      5,
      currentLocation,
      new Date('2026-03-08T10:00:00.000Z'),
      new Date('2026-03-08T11:00:00.000Z'),
      'On route'
    );

    expect(progress.getCompletedStops()).toBe(2);
    expect(progress.getTotalStops()).toBe(5);
    expect(progress.getCurrentLocation()).toBe(currentLocation);
    expect(progress.getProgressPercentage()).toBe(40);
    expect(progress.getRemainingStops()).toBe(3);
    expect(progress.isCompleted()).toBe(false);
    expect(progress.getNotes()).toBe('On route');
    expect(progress.getEstimatedCompletionTime()).toEqual(new Date('2026-03-08T11:00:00.000Z'));
  });

  it('validates invalid progress values', () => {
    expect(() => RouteProgress.create(-1, 5, currentLocation)).toThrow('Completed stops cannot be negative');
    expect(() => RouteProgress.create(1, 0, currentLocation)).toThrow('Total stops must be positive');
    expect(() => RouteProgress.create(6, 5, currentLocation)).toThrow('Completed stops cannot exceed total stops');
  });

  it('fromDatabase maps db payload and date strings', () => {
    const progress = RouteProgress.fromDatabase({
      completed_stops: 5,
      total_stops: 5,
      current_lat: -6.8,
      current_lng: 39.21,
      current_address: 'Db Point',
      last_update_time: '2026-03-08T09:30:00.000Z',
      estimated_completion_time: '2026-03-08T10:15:00.000Z',
      notes: 'db notes'
    });

    expect(progress.getCompletedStops()).toBe(5);
    expect(progress.isCompleted()).toBe(true);
    expect(progress.getCurrentLocation().getAddress()).toBe('Db Point');
    expect(progress.getLastUpdateTime()).toBeInstanceOf(Date);
    expect(progress.getEstimatedCompletionTime()).toBeInstanceOf(Date);
  });

  it('updateProgress returns a new immutable progress snapshot', () => {
    const initial = RouteProgress.create(1, 4, currentLocation, new Date('2026-03-08T09:00:00.000Z'));
    const nextLocation = GeoPoint.create(-6.81, 39.24, 'Next');

    const updated = initial.updateProgress(
      3,
      nextLocation,
      new Date('2026-03-08T10:00:00.000Z'),
      'almost done'
    );

    expect(updated).not.toBe(initial);
    expect(updated.getCompletedStops()).toBe(3);
    expect(updated.getCurrentLocation()).toBe(nextLocation);
    expect(updated.getNotes()).toBe('almost done');
    expect(updated.getLastUpdateTime().getTime()).toBeGreaterThanOrEqual(initial.getLastUpdateTime().getTime());
  });

  it('toJSON serializes snapshot values', () => {
    const progress = RouteProgress.create(
      4,
      4,
      currentLocation,
      new Date('2026-03-08T09:00:00.000Z'),
      undefined,
      'completed'
    );

    expect(progress.toJSON()).toEqual(
      expect.objectContaining({
        completedStops: 4,
        totalStops: 4,
        progressPercentage: 100,
        remainingStops: 0,
        currentLocation: { lat: -6.79, lng: 39.2 },
        notes: 'completed',
        isCompleted: true
      })
    );
  });
});
