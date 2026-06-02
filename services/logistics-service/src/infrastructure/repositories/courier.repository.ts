import { ICourierRepository, Courier } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';
import { CourierStatus, isCourierAvailable, normalizeCourierStatus } from '../../domain/enums/courier-status.enum';

export class CourierRepository implements ICourierRepository {
  constructor(private databaseClient: any) { }

  private getPrefilterConfig(): { maxCandidates: number } {
    const maxCandidates = Number(process.env.COURIER_PREFILTER_MAX_CANDIDATES ?? '15');
    return {
      maxCandidates: Number.isFinite(maxCandidates) && maxCandidates > 0 ? maxCandidates : 15
    };
  }

  async findAvailableCouriers(location: GeoPoint, radius: number): Promise<Courier[]> {
    // Validate inputs
    if (!location) {
      return Promise.reject(new Error('Location is required'));
    }
    if (typeof radius !== 'number' || radius <= 0) {
      return Promise.reject(new Error('Radius must be a positive number'));
    }

    try {
      const coords = location.getCoordinates();

      console.log('🔍 DEBUG - CourierRepository.findAvailableCouriers called');
      console.log('🔍 DEBUG - Search location:', coords);
      console.log('🔍 DEBUG - Search radius:', radius);

      // Query available couriers within radius using PostGIS
      const query = this.databaseClient
        .from('couriers')
        .select(`
          id,
          name,
          phone,
          vehicle_type,
          max_weight,
          max_volume,
          max_items,
          rating,
          completion_rate,
          current_lat,
          current_lng,
          current_address,
          is_available,
          status,
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('is_available', true)
        .gte('rating', 4.0)
        .gte('completion_rate', 0.90)
        .filter('current_lat', 'not.is', null)
        .filter('current_lng', 'not.is', null);

      console.log('🔍 DEBUG - Executing query:', query);

      const { data: couriers, error } = await query;

      console.log('🔍 DEBUG - Query result - error:', error);
      console.log('🔍 DEBUG - Query result - couriers count:', couriers?.length || 0);
      if (couriers && couriers.length > 0) {
        console.log('🔍 DEBUG - First courier from query:', JSON.stringify(couriers[0], null, 2));
      }

      if (error) {
        console.error('Database query error:', error);
        throw new Error('Failed to query available couriers');
      }

      if (!couriers || couriers.length === 0) {
        return [];
      }

      const { maxCandidates } = this.getPrefilterConfig();

      type PrefilterEntry = { courier: any; courierLocation: GeoPoint; straightDistance: number };

      const prefiltered: PrefilterEntry[] = couriers
        .map((courier: any): PrefilterEntry => {
          const courierLocation = GeoPoint.create(
            courier.current_lat,
            courier.current_lng,
            courier.current_address || 'Unknown'
          );
          const straightDistance = location.distanceTo(courierLocation);
          return { courier, courierLocation, straightDistance };
        })
        .filter((entry: PrefilterEntry) => entry.straightDistance <= radius)
        .sort((a: PrefilterEntry, b: PrefilterEntry) => a.straightDistance - b.straightDistance)
        .slice(0, maxCandidates);

      if (prefiltered.length === 0) {
        return [];
      }

      // Filter by route distance using the configured local routing provider
      const distanceChecks = await Promise.all(
        prefiltered.map(async (entry: PrefilterEntry) => {
          const routeDistance = await DistanceCalculationAlgorithm.calculateDeliveryDistance(
            location,
            entry.courierLocation
          );
          return routeDistance.distance <= radius;
        })
      );
      const availableCouriers = prefiltered.filter((_: any, index: number) => distanceChecks[index]);

      // Map to domain entities
      return availableCouriers.map((entry: any) => {
        const status = normalizeCourierStatus(
          entry.courier.status ?? (entry.courier.is_available ? 'online' : 'offline')
        );
        return {
          id: entry.courier.id,
          name: entry.courier.name,
          phone: entry.courier.phone,
          vehicle: {
            type: entry.courier.vehicle_type,
            capacity: {
              maxWeight: entry.courier.max_weight,
              maxVolume: entry.courier.max_volume,
              maxItems: entry.courier.max_items
            }
          },
          rating: entry.courier.rating,
          completionRate: entry.courier.completion_rate,
          currentLocation: GeoPoint.create(
            entry.courier.current_lat,
            entry.courier.current_lng,
            entry.courier.current_address || 'Unknown'
          ),
          status,
          isAvailable: isCourierAvailable(status),
          trafficExperience: entry.courier.traffic_experience || 0.8
        };
      });

    } catch (error) {
      console.error('Error finding available couriers:', error);
      throw new Error('Failed to find available couriers');
    }
  }

  async findAvailable(): Promise<Courier[]> {
    try {
      const { data: couriers, error } = await this.databaseClient
        .from('couriers')
        .select(`
          id,
          name,
          phone,
          vehicle_type,
          max_weight,
          max_volume,
          max_items,
          rating,
          completion_rate,
          current_lat,
          current_lng,
          current_address,
          is_available,
          status,
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('is_available', true);

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!couriers || couriers.length === 0) {
        return [];
      }

      // Map to domain entities
      return couriers.map((courier: any) => {
        const status = normalizeCourierStatus(courier.status ?? (courier.is_available ? 'online' : 'offline'));
        return {
          id: courier.id,
          name: courier.name,
          phone: courier.phone,
          vehicle: {
            type: courier.vehicle_type,
            capacity: {
              maxWeight: courier.max_weight,
              maxVolume: courier.max_volume,
              maxItems: courier.max_items
            }
          },
          rating: courier.rating,
          completionRate: courier.completion_rate,
          currentLocation: GeoPoint.create(
            courier.current_lat,
            courier.current_lng,
            courier.current_address || 'Unknown'
          ),
          status,
          isAvailable: isCourierAvailable(status),
          trafficExperience: courier.traffic_experience || 0.8
        };
      });

    } catch (error) {
      console.error('Error finding available couriers:', error);
      return [];
    }
  }

  async findById(courierId: string): Promise<Courier | null> {
    try {
      const { data: courier, error } = await this.databaseClient
        .from('couriers')
        .select(`
          id,
          name,
          phone,
          vehicle_type,
          max_weight,
          max_volume,
          max_items,
          rating,
          completion_rate,
          current_lat,
          current_lng,
          current_address,
          is_available,
          status,
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('Database query error:', error);
        return null;
      }

      if (!courier) {
        return null;
      }

      const status = normalizeCourierStatus(courier.status ?? (courier.is_available ? 'online' : 'offline'));
      // Map to domain entity
      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        vehicle: {
          type: courier.vehicle_type,
          capacity: {
            maxWeight: courier.max_weight,
            maxVolume: courier.max_volume,
            maxItems: courier.max_items
          }
        },
        rating: courier.rating,
        completionRate: courier.completion_rate,
        currentLocation: GeoPoint.create(
          courier.current_lat,
          courier.current_lng,
          courier.current_address || 'Unknown'
        ),
        status,
        isAvailable: isCourierAvailable(status),
        trafficExperience: courier.traffic_experience || 0.8
      };

    } catch (error) {
      console.error('Error finding courier by ID:', error);
      return null;
    }
  }

  async assignCourier(deliveryId: string, courierId: string): Promise<void> {
    try {
      // Update courier availability to false and link to delivery
      const { error } = await this.databaseClient
        .from('couriers')
        .update({
          is_available: false,
          status: 'busy',
          current_delivery_id: deliveryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to assign courier to delivery');
      }

      // Create assignment record in delivery_assignments table
      const { error: assignmentError } = await this.databaseClient
        .from('delivery_assignments')
        .insert({
          delivery_id: deliveryId,
          courier_id: courierId,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        });

      if (assignmentError) {
        console.error('Database assignment insert error:', assignmentError);
        // Rollback courier update
        await this.databaseClient
          .from('couriers')
          .update({
            is_available: true,
            status: 'online',
            current_delivery_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', courierId);

        throw new Error('Failed to create delivery assignment record');
      }

    } catch (error) {
      console.error('Error assigning courier:', error);
      throw new Error('Failed to assign courier to delivery');
    }
  }

  async getCourierById(courierId: string): Promise<Courier> {
    try {
      const { data: courier, error } = await this.databaseClient
        .from('couriers')
        .select(`
          id,
          name,
          phone,
          vehicle_type,
          max_weight,
          max_volume,
          max_items,
          rating,
          completion_rate,
          current_lat,
          current_lng,
          current_address,
          is_available,
          status,
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('Database query error:', error);
        throw new Error('Failed to query courier information');
      }

      if (!courier) {
        throw new Error(`Courier with ID ${courierId} not found`);
      }

      const status = normalizeCourierStatus(courier.status ?? (courier.is_available ? 'online' : 'offline'));
      // Map to domain entity
      return {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        vehicle: {
          type: courier.vehicle_type,
          capacity: {
            maxWeight: courier.max_weight,
            maxVolume: courier.max_volume,
            maxItems: courier.max_items
          }
        },
        rating: courier.rating,
        completionRate: courier.completion_rate,
        currentLocation: GeoPoint.create(
          courier.current_lat,
          courier.current_lng,
          courier.current_address || 'Unknown'
        ),
        status,
        isAvailable: isCourierAvailable(status),
        trafficExperience: courier.traffic_experience || 0.8
      };

    } catch (error) {
      console.error('Error getting courier by ID:', error);
      throw new Error('Failed to get courier information');
    }
  }

  async updateCourierLocation(courierId: string, location: GeoPoint): Promise<void> {
    try {
      // Convert raw location data to GeoPoint if needed
      const geoPoint = location instanceof GeoPoint 
        ? location 
        : GeoPoint.create(
            (location as any).lat || (location as any).latitude,
            (location as any).lng || (location as any).longitude,
            (location as any).address || 'Unknown'
          );

      const coords = geoPoint.getCoordinates();

      const { error } = await this.databaseClient
        .from('couriers')
        .update({
          current_lat: coords.lat,
          current_lng: coords.lng,
          current_address: geoPoint.getAddress(),
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update courier location');
      }

    } catch (error) {
      console.error('Error updating courier location:', error);
      throw new Error('Failed to update courier location');
    }
  }

  async updateCourierAvailability(courierId: string, isAvailable: boolean): Promise<void> {
    const status: CourierStatus = isAvailable ? 'online' : 'offline';
    await this.updateCourierStatus(courierId, status);
  }

  async updateCourierStatus(courierId: string, status: CourierStatus): Promise<void> {
    try {
      const isAvailable = isCourierAvailable(status);
      const update: Record<string, unknown> = {
        is_available: isAvailable,
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'online' || status === 'offline') {
        update.current_delivery_id = null;
      }

      const { error } = await this.databaseClient
        .from('couriers')
        .update(update)
        .eq('id', courierId);

      if (error) {
        console.error('Database update error:', error);
        throw new Error('Failed to update courier status');
      }
    } catch (error) {
      console.error('Error updating courier status:', error);
      throw new Error('Failed to update courier status');
    }
  }

  async getCourierPerformance(courierId: string): Promise<{
    totalDeliveries: number;
    onTimeRate: number;
    averageRating: number;
  }> {
    try {
      // Aggregate delivery statistics from deliveries table
      const { data: deliveries, error } = await this.databaseClient
        .from('deliveries')
        .select('status, actual_delivery_time, estimated_delivery_time')
        .eq('courier_id', courierId)
        .eq('status', 'delivered');

      if (error) {
        console.error('Database query error:', error);
        throw new Error('Failed to query delivery statistics');
      }

      if (!deliveries || deliveries.length === 0) {
        return {
          totalDeliveries: 0,
          onTimeRate: 0,
          averageRating: 0
        };
      }

      const totalDeliveries = deliveries.length;
      const onTimeDeliveries = deliveries.filter((delivery: any) => {
        if (!delivery.actual_delivery_time || !delivery.estimated_delivery_time) return false;
        const actual = new Date(delivery.actual_delivery_time);
        const estimated = new Date(delivery.estimated_delivery_time);
        return actual <= estimated;
      }).length;

      const onTimeRate = totalDeliveries > 0 ? onTimeDeliveries / totalDeliveries : 0;

      // Get current rating from couriers table
      const { data: courier } = await this.databaseClient
        .from('couriers')
        .select('rating')
        .eq('id', courierId)
        .single();

      return {
        totalDeliveries,
        onTimeRate,
        averageRating: courier?.rating || 0
      };

    } catch (error) {
      console.error('Error getting courier performance:', error);
      throw new Error('Failed to get courier performance metrics');
    }
  }
}

