import { GeoPoint } from './geopoint.value-object';

export class RouteProgress {
  private constructor(
    private readonly completedStops: number,
    private readonly totalStops: number,
    private readonly currentLocation: GeoPoint,
    private readonly lastUpdateTime: Date,
    private readonly estimatedCompletionTime?: Date,
    private readonly notes?: string
  ) {
    this.validate();
  }

  public static create(
    completedStops: number,
    totalStops: number,
    currentLocation: GeoPoint,
    lastUpdateTime: Date = new Date(),
    estimatedCompletionTime?: Date,
    notes?: string
  ): RouteProgress {
    return new RouteProgress(
      completedStops,
      totalStops,
      currentLocation,
      lastUpdateTime,
      estimatedCompletionTime,
      notes
    );
  }

  public static fromDatabase(data: {
    completed_stops: number;
    total_stops: number;
    current_lat: number;
    current_lng: number;
    current_address: string;
    last_update_time: string | Date;
    estimated_completion_time?: string | Date;
    notes?: string;
  }): RouteProgress {
    const currentLocation = GeoPoint.create(
      data.current_lat,
      data.current_lng,
      data.current_address
    );

    const lastUpdateTime = data.last_update_time instanceof Date
      ? data.last_update_time
      : new Date(data.last_update_time);

    const estimatedCompletionTime = data.estimated_completion_time
      ? (data.estimated_completion_time instanceof Date
          ? data.estimated_completion_time
          : new Date(data.estimated_completion_time))
      : undefined;

    return new RouteProgress(
      data.completed_stops,
      data.total_stops,
      currentLocation,
      lastUpdateTime,
      estimatedCompletionTime,
      data.notes
    );
  }

  private validate(): void {
    if (this.completedStops < 0) {
      throw new Error('Completed stops cannot be negative');
    }
    if (this.totalStops <= 0) {
      throw new Error('Total stops must be positive');
    }
    if (this.completedStops > this.totalStops) {
      throw new Error('Completed stops cannot exceed total stops');
    }
    if (!this.currentLocation) {
      throw new Error('Current location is required');
    }
    if (!this.lastUpdateTime) {
      throw new Error('Last update time is required');
    }
  }

  public getCompletedStops(): number {
    return this.completedStops;
  }

  public getTotalStops(): number {
    return this.totalStops;
  }

  public getCurrentLocation(): GeoPoint {
    return this.currentLocation;
  }

  public getLastUpdateTime(): Date {
    return this.lastUpdateTime;
  }

  public getEstimatedCompletionTime(): Date | undefined {
    return this.estimatedCompletionTime;
  }

  public getNotes(): string | undefined {
    return this.notes;
  }

  public getProgressPercentage(): number {
    return this.totalStops > 0 ? (this.completedStops / this.totalStops) * 100 : 0;
  }

  public getRemainingStops(): number {
    return this.totalStops - this.completedStops;
  }

  public isCompleted(): boolean {
    return this.completedStops >= this.totalStops;
  }

  public updateProgress(
    completedStops: number,
    currentLocation: GeoPoint,
    estimatedCompletionTime?: Date,
    notes?: string
  ): RouteProgress {
    return new RouteProgress(
      completedStops,
      this.totalStops,
      currentLocation,
      new Date(),
      estimatedCompletionTime,
      notes
    );
  }

  public toJSON() {
    return {
      completedStops: this.completedStops,
      totalStops: this.totalStops,
      progressPercentage: this.getProgressPercentage(),
      remainingStops: this.getRemainingStops(),
      currentLocation: this.currentLocation.getCoordinates(),
      lastUpdateTime: this.lastUpdateTime.toISOString(),
      estimatedCompletionTime: this.estimatedCompletionTime?.toISOString(),
      notes: this.notes,
      isCompleted: this.isCompleted()
    };
  }
}
