export interface CourierInfo {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'motorcycle' | 'bicycle' | 'car' | 'truck';
  currentLocation: { lat: number; lng: number };
  isAvailable: boolean;
  rating: number;
  completedDeliveries: number;
}

export interface VehicleInfo {
  id: string;
  type: 'motorcycle' | 'bicycle' | 'car' | 'truck';
  capacity: number; // kg
  isActive: boolean;
  lastMaintenance: Date;
  nextMaintenanceDue: Date;
}

export interface RouteOptimization {
  estimatedDuration: number; // minutes
  estimatedDistance: number; // km
  waypoints: Array<{ lat: number; lng: number; address: string }>;
  trafficFactor: number;
}

export class CourierAdapter {
  private readonly courierServiceUrl = 'http://localhost:3015';

  async findAvailableCouriers(deliveryLocation: { lat: number; lng: number }, orderWeight: number): Promise<CourierInfo[]> {
    try {
      const response = await fetch(`${this.courierServiceUrl}/api/couriers/available`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: deliveryLocation, weight: orderWeight })
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch available couriers: ${error.message}`);
    }
  }

  async assignDelivery(courierId: string, orderId: string, deliveryDetails: any): Promise<{ success: boolean; estimatedPickupTime?: Date }> {
    try {
      const response = await fetch(`${this.courierServiceUrl}/api/deliveries/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierId, orderId, ...deliveryDetails })
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to assign delivery: ${error.message}`);
    }
  }

  async optimizeRoute(pickupLocation: { lat: number; lng: number }, deliveryLocation: { lat: number; lng: number }): Promise<RouteOptimization> {
    try {
      const response = await fetch(`${this.courierServiceUrl}/api/routes/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: pickupLocation, delivery: deliveryLocation })
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to optimize route: ${error.message}`);
    }
  }

  async trackDelivery(orderId: string): Promise<{ location: { lat: number; lng: number }; status: string; eta: Date }> {
    try {
      const response = await fetch(`${this.courierServiceUrl}/api/deliveries/${orderId}/track`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to track delivery: ${error.message}`);
    }
  }

  async updateDeliveryStatus(orderId: string, status: string, location?: { lat: number; lng: number }): Promise<void> {
    try {
      await fetch(`${this.courierServiceUrl}/api/deliveries/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, location })
      });
    } catch (error) {
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }
  }

  async getCourierPerformance(courierId: string): Promise<{ rating: number; completedDeliveries: number; onTimeRate: number }> {
    try {
      const response = await fetch(`${this.courierServiceUrl}/api/couriers/${courierId}/performance`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get courier performance: ${error.message}`);
    }
  }

  async validateVehicleCapacity(vehicleId: string, orderWeight: number): Promise<{ canHandle: boolean; reason?: string }> {
    try {
      const response = await fetch(`${this.courierServiceUrl}/api/vehicles/${vehicleId}/capacity-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight: orderWeight })
      });
      
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to validate vehicle capacity: ${error.message}`);
    }
  }
}