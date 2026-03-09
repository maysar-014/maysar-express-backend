import { RouteStatus, RouteStatusLabels } from './route-status.enum';

describe('RouteStatus enum', () => {
  it('contains expected route lifecycle statuses', () => {
    expect(RouteStatus.PLANNED).toBe('planned');
    expect(RouteStatus.ASSIGNED).toBe('assigned');
    expect(RouteStatus.IN_PROGRESS).toBe('in_progress');
    expect(RouteStatus.COMPLETED).toBe('completed');
    expect(RouteStatus.CANCELLED).toBe('cancelled');
    expect(RouteStatus.DELAYED).toBe('delayed');
  });

  it('exposes human-readable labels for each status', () => {
    expect(RouteStatusLabels[RouteStatus.PLANNED]).toBe('Planned');
    expect(RouteStatusLabels[RouteStatus.ASSIGNED]).toBe('Assigned');
    expect(RouteStatusLabels[RouteStatus.IN_PROGRESS]).toBe('In Progress');
    expect(RouteStatusLabels[RouteStatus.COMPLETED]).toBe('Completed');
    expect(RouteStatusLabels[RouteStatus.CANCELLED]).toBe('Cancelled');
    expect(RouteStatusLabels[RouteStatus.DELAYED]).toBe('Delayed');
  });
});
