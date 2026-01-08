export interface CourierLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface CourierVehicle {
  type: 'motorcycle' | 'bicycle' | 'van' | 'car';
  licensePlate: string;
  capacity: number;
  fuelType: 'petrol' | 'electric' | 'hybrid';
}

export interface CourierPerformance {
  onTimeDeliveryRate: number;
  customerRating: number;
  completedDeliveries: number;
  totalEarnings: number;
  averageDeliveryTime: number;
}

export class CourierEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly email: string,
    public readonly vehicle: CourierVehicle,
    public status: 'active' | 'inactive' | 'busy' | 'offline',
    public currentLocation?: CourierLocation,
    public performance?: CourierPerformance,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  updateLocation(location: CourierLocation): void {
    this.currentLocation = location;
    this.updatedAt = new Date();
  }

  updateStatus(status: 'active' | 'inactive' | 'busy' | 'offline'): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  updatePerformance(performance: Partial<CourierPerformance>): void {
    this.performance = { ...this.performance, ...performance } as CourierPerformance;
    this.updatedAt = new Date();
  }

  isAvailable(): boolean {
    return this.status === 'active';
  }

  isBusy(): boolean {
    return this.status === 'busy';
  }

  getDistanceFrom(location: { latitude: number; longitude: number }): number {
    if (!this.currentLocation) return Infinity;
    
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(location.latitude - this.currentLocation.latitude);
    const dLon = this.toRad(location.longitude - this.currentLocation.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(this.currentLocation.latitude)) * 
              Math.cos(this.toRad(location.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.id) errors.push('Courier ID is required');
    if (!this.name) errors.push('Courier name is required');
    if (!this.phone) errors.push('Phone number is required');
    if (!this.email) errors.push('Email is required');
    if (!this.vehicle) errors.push('Vehicle information is required');

    if (this.vehicle) {
      if (!this.vehicle.type) errors.push('Vehicle type is required');
      if (!this.vehicle.licensePlate) errors.push('License plate is required');
      if (this.vehicle.capacity <= 0) errors.push('Vehicle capacity must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}