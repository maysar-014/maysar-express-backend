import { GeoPoint } from '../value-objects/geopoint.value-object';
import { RouteProgress } from '../value-objects/route-progress.value-object';
import { RouteStatus } from '../enums/route-status.enum';

export class Route {
  private constructor(
    private readonly id: string,
    private readonly courierId: string,
    private status: RouteStatus,
    private readonly totalDistance: number,
    private readonly estimatedDuration: number,
    private readonly waypoints: GeoPoint[],
    private progress: RouteProgress,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private actualDuration?: number,
    private completedAt?: Date
  ) {
    this.validate();
  }

  public static create(params: {
    id: string;
    courierId: string;
    status?: RouteStatus;
    totalDistance: number;
    estimatedDuration: number;
    waypoints: GeoPoint[];
    progress?: RouteProgress;
    createdAt?: Date;
    updatedAt?: Date;
  }): Route {
    const now = new Date();
    const status = params.status || RouteStatus.PLANNED;

    // Create default progress if not provided
    const progress = params.progress || RouteProgress.create(
      0, // completedStops
      params.waypoints.length, // totalStops
      params.waypoints[0] || GeoPoint.create(0, 0, 'Unknown'), // currentLocation
      now // lastUpdateTime
    );

    return new Route(
      params.id,
      params.courierId,
      status,
      params.totalDistance,
      params.estimatedDuration,
      params.waypoints,
      progress,
      params.createdAt || now,
      params.updatedAt || now,
      undefined, // actualDuration
      undefined // completedAt
    );
  }

  public static fromDatabase(data: {
    id: string;
    courier_id: string;
    status: RouteStatus;
    total_distance: number;
    estimated_duration: number;
    actual_duration?: number;
    waypoints: GeoPoint[];
    progress: RouteProgress;
    created_at: string | Date;
    updated_at: string | Date;
    completed_at?: string | Date;
  }): Route {
    const createdAt = data.created_at instanceof Date ? data.created_at : new Date(data.created_at);
    const updatedAt = data.updated_at instanceof Date ? data.updated_at : new Date(data.updated_at);
    const completedAt = data.completed_at
      ? (data.completed_at instanceof Date ? data.completed_at : new Date(data.completed_at))
      : undefined;

    return new Route(
      data.id,
      data.courier_id,
      data.status,
      data.total_distance,
      data.estimated_duration,
      data.waypoints,
      data.progress,
      createdAt,
      updatedAt,
      data.actual_duration,
      completedAt
    );
  }

  private validate(): void {
    if (!this.id) {
      throw new Error('Route ID is required');
    }
    if (!this.courierId) {
      throw new Error('Courier ID is required');
    }
    if (this.totalDistance < 0) {
      throw new Error('Total distance cannot be negative');
    }
    if (this.estimatedDuration < 0) {
      throw new Error('Estimated duration cannot be negative');
    }
    if (this.actualDuration !== undefined && this.actualDuration < 0) {
      throw new Error('Actual duration cannot be negative');
    }
    if (!this.waypoints || this.waypoints.length < 2) {
      throw new Error('Route must have at least 2 waypoints');
    }
    if (!this.progress) {
      throw new Error('Route progress is required');
    }
  }

  // Getters
  public getId(): string {
    return this.id;
  }

  public getCourierId(): string {
    return this.courierId;
  }

  public getStatus(): RouteStatus {
    return this.status;
  }

  public getTotalDistance(): number {
    return this.totalDistance;
  }

  public getEstimatedDuration(): number {
    return this.estimatedDuration;
  }

  public getActualDuration(): number | undefined {
    return this.actualDuration;
  }

  public getWaypoints(): GeoPoint[] {
    return [...this.waypoints];
  }

  public getProgress(): RouteProgress {
    return this.progress;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  public getCompletedAt(): Date | undefined {
    return this.completedAt;
  }

  // Business logic methods
  public isCompleted(): boolean {
    return this.status === RouteStatus.COMPLETED;
  }

  public isInProgress(): boolean {
    return this.status === RouteStatus.IN_PROGRESS;
  }

  public canStart(): boolean {
    return this.status === RouteStatus.ASSIGNED || this.status === RouteStatus.PLANNED;
  }

  public canComplete(): boolean {
    return this.status === RouteStatus.IN_PROGRESS && this.progress.isCompleted();
  }

  // State change methods
  public assignToCourier(): Route {
    if (this.status !== RouteStatus.PLANNED) {
      throw new Error('Only planned routes can be assigned');
    }
    return this.withStatus(RouteStatus.ASSIGNED);
  }

  public startRoute(): Route {
    if (!this.canStart()) {
      throw new Error('Route cannot be started in current status');
    }
    return this.withStatus(RouteStatus.IN_PROGRESS);
  }

  public completeRoute(actualDuration?: number): Route {
    if (!this.canComplete()) {
      throw new Error('Route cannot be completed in current status');
    }

    const completedAt = new Date();
    const route = this.withStatus(RouteStatus.COMPLETED);
    route.completedAt = completedAt;
    if (actualDuration !== undefined) {
      route.actualDuration = actualDuration;
    }
    route.updatedAt = completedAt;
    return route;
  }

  public updateProgress(newProgress: RouteProgress): Route {
    return new Route(
      this.id,
      this.courierId,
      this.status,
      this.totalDistance,
      this.estimatedDuration,
      this.waypoints,
      newProgress,
      this.createdAt,
      new Date(), // updatedAt
      this.actualDuration,
      this.completedAt
    );
  }

  public cancelRoute(): Route {
    if (this.isCompleted()) {
      throw new Error('Completed routes cannot be cancelled');
    }
    return this.withStatus(RouteStatus.CANCELLED);
  }

  private withStatus(newStatus: RouteStatus): Route {
    return new Route(
      this.id,
      this.courierId,
      newStatus,
      this.totalDistance,
      this.estimatedDuration,
      this.waypoints,
      this.progress,
      this.createdAt,
      new Date(), // updatedAt
      this.actualDuration,
      this.completedAt
    );
  }

  // Utility methods
  public getOrigin(): GeoPoint {
    return this.waypoints[0];
  }

  public getDestination(): GeoPoint {
    return this.waypoints[this.waypoints.length - 1];
  }

  public getStopCount(): number {
    return this.waypoints.length;
  }

  public getRemainingDistance(): number {
    const completedStops = this.progress.getCompletedStops();
    if (completedStops >= this.waypoints.length - 1) {
      return 0;
    }

    // Calculate remaining distance from current position
    let remainingDistance = 0;
    for (let i = completedStops; i < this.waypoints.length - 1; i++) {
      remainingDistance += this.waypoints[i].distanceTo(this.waypoints[i + 1]);
    }
    return remainingDistance;
  }

  public toJSON() {
    return {
      id: this.id,
      courierId: this.courierId,
      status: this.status,
      totalDistance: this.totalDistance,
      estimatedDuration: this.estimatedDuration,
      actualDuration: this.actualDuration,
      waypoints: this.waypoints.map(wp => wp.getCoordinates()),
      progress: this.progress.toJSON(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      isCompleted: this.isCompleted(),
      isInProgress: this.isInProgress(),
      remainingDistance: this.getRemainingDistance()
    };
  }

  public toSummary() {
    return {
      id: this.id,
      courierId: this.courierId,
      status: this.status,
      totalDistance: this.totalDistance,
      estimatedDuration: this.estimatedDuration,
      progressPercentage: this.progress.getProgressPercentage(),
      createdAt: this.createdAt.toISOString()
    };
  }
}
