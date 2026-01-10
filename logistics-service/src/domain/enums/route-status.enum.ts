export enum RouteStatus {
  PLANNED = 'planned',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed'
}

export const RouteStatusLabels = {
  [RouteStatus.PLANNED]: 'Planned',
  [RouteStatus.ASSIGNED]: 'Assigned',
  [RouteStatus.IN_PROGRESS]: 'In Progress',
  [RouteStatus.COMPLETED]: 'Completed',
  [RouteStatus.CANCELLED]: 'Cancelled',
  [RouteStatus.DELAYED]: 'Delayed'
} as const;
