import { ICourierRepository, Courier } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class CourierRepository implements ICourierRepository {
  constructor(private supabaseClient: any) { }

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
      const query = this.supabaseClient
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
        console.error('Supabase query error:', error);
        throw new Error('Failed to query available couriers');
      }

      if (!couriers || couriers.length === 0) {
        return [];
      }

      // Filter by geographical distance (since PostGIS ST_DWithin is complex to set up)
      const availableCouriers = couriers.filter((courier: any) => {
        const courierLocation = GeoPoint.create(
          courier.current_lat,
          courier.current_lng,
          courier.current_address || 'Unknown'
        );
        const distance = location.distanceTo(courierLocation);
        return distance <= radius;
      });

      // Map to domain entities
      return availableCouriers.map((courier: any) => ({
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
        isAvailable: courier.is_available,
        trafficExperience: courier.traffic_experience || 0.8
      }));

    } catch (error) {
      console.error('Error finding available couriers:', error);
      throw new Error('Failed to find available couriers');
    }
  }

  async findAvailable(): Promise<Courier[]> {
    try {
      const { data: couriers, error } = await this.supabaseClient
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
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('is_available', true);

      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }

      if (!couriers || couriers.length === 0) {
        return [];
      }

      // Map to domain entities
      return couriers.map((courier: any) => ({
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
        isAvailable: courier.is_available,
        trafficExperience: courier.traffic_experience || 0.8
      }));

    } catch (error) {
      console.error('Error finding available couriers:', error);
      return [];
    }
  }

  async findById(courierId: string): Promise<Courier | null> {
    try {
      const { data: courier, error } = await this.supabaseClient
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
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }

      if (!courier) {
        return null;
      }

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
        isAvailable: courier.is_available,
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
      const { error } = await this.supabaseClient
        .from('couriers')
        .update({
          is_available: false,
          current_delivery_id: deliveryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Failed to assign courier to delivery');
      }

      // Create assignment record in delivery_assignments table
      const { error: assignmentError } = await this.supabaseClient
        .from('delivery_assignments')
        .insert({
          delivery_id: deliveryId,
          courier_id: courierId,
          assigned_at: new Date().toISOString(),
          status: 'assigned'
        });

      if (assignmentError) {
        console.error('Supabase assignment insert error:', assignmentError);
        // Rollback courier update
        await this.supabaseClient
          .from('couriers')
          .update({
            is_available: true,
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
      const { data: courier, error } = await this.supabaseClient
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
          traffic_experience,
          created_at,
          updated_at
        `)
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error('Failed to query courier information');
      }

      if (!courier) {
        throw new Error(`Courier with ID ${courierId} not found`);
      }

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
        isAvailable: courier.is_available,
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

      const { error } = await this.supabaseClient
        .from('couriers')
        .update({
          current_lat: coords.lat,
          current_lng: coords.lng,
          current_address: geoPoint.getAddress(),
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Failed to update courier location');
      }

    } catch (error) {
      console.error('Error updating courier location:', error);
      throw new Error('Failed to update courier location');
    }
  }

  async updateCourierAvailability(courierId: string, isAvailable: boolean): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('couriers')
        .update({
          is_available: isAvailable,
          current_delivery_id: isAvailable ? null : undefined, // Clear delivery if becoming available
          updated_at: new Date().toISOString()
        })
        .eq('id', courierId);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Failed to update courier availability');
      }

    } catch (error) {
      console.error('Error updating courier availability:', error);
      throw new Error('Failed to update courier availability');
    }
  }

  async getCourierPerformance(courierId: string): Promise<{
    totalDeliveries: number;
    onTimeRate: number;
    averageRating: number;
  }> {
    try {
      // Aggregate delivery statistics from deliveries table
      const { data: deliveries, error } = await this.supabaseClient
        .from('deliveries')
        .select('status, actual_delivery_time, estimated_delivery_time')
        .eq('courier_id', courierId)
        .eq('status', 'delivered');

      if (error) {
        console.error('Supabase query error:', error);
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
      const { data: courier } = await this.supabaseClient
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
