import { ITrackingRepository, Tracking } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class TrackingRepository implements ITrackingRepository {
  constructor(private databaseClient: any) { }

  async save(tracking: Tracking): Promise<void> {
    try {
      const trackingData = {
        id: tracking.id,
        delivery_id: tracking.deliveryId,
        courier_id: tracking.courierId,
        location_lat: tracking.location.getCoordinates().lat,
        location_lng: tracking.location.getCoordinates().lng,
        location_address: tracking.location.getAddress(),
        speed: tracking.speed,
        heading: tracking.heading,
        timestamp: tracking.timestamp.toISOString(),
        status: tracking.status,
        battery_level: tracking.batteryLevel,
        accuracy: tracking.accuracy
      };

      const { error } = await this.databaseClient
        .from('tracking')
        .upsert(trackingData, { onConflict: 'id' });

      if (error) {
        console.error('Database upsert error:', error);
        throw new Error('Failed to save tracking data to database');
      }

    } catch (error) {
      console.error('Error saving tracking data:', error);
      throw new Error('Failed to save tracking data');
    }
  }

  async findByDeliveryId(deliveryId: string): Promise<Tracking[]> {
    try {
      const { data: tracking, error } = await this.databaseClient
        .from('tracking')
        .select(`
          id,
          delivery_id,
          courier_id,
          location_lat,
          location_lng,
          location_address,
          speed,
          heading,
          timestamp,
          status,
          battery_level,
          accuracy
        `)
        .eq('delivery_id', deliveryId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!tracking || tracking.length === 0) {
        return [];
      }

      // Map to domain entities
      return tracking.map((track: any) => ({
        id: track.id,
        deliveryId: track.delivery_id,
        courierId: track.courier_id,
        location: GeoPoint.create(track.location_lat, track.location_lng, track.location_address || 'Unknown'),
        speed: track.speed,
        heading: track.heading,
        timestamp: new Date(track.timestamp),
        status: track.status,
        batteryLevel: track.battery_level,
        accuracy: track.accuracy
      }));

    } catch (error) {
      console.error('Error finding tracking by delivery ID:', error);
      return [];
    }
  }

  async findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<Tracking[]> {
    try {
      let query = this.databaseClient
        .from('tracking')
        .select(`
          id,
          delivery_id,
          courier_id,
          location_lat,
          location_lng,
          location_address,
          speed,
          heading,
          timestamp,
          status,
          battery_level,
          accuracy
        `)
        .eq('courier_id', courierId);

      // Apply time range filter if provided
      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start.toISOString())
          .lte('timestamp', timeRange.end.toISOString());
      }

      const { data: tracking, error } = await query.order('timestamp', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        return [];
      }

      if (!tracking || tracking.length === 0) {
        return [];
      }

      // Map to domain entities
      return tracking.map((track: any) => ({
        id: track.id,
        deliveryId: track.delivery_id,
        courierId: track.courier_id,
        location: GeoPoint.create(track.location_lat, track.location_lng, track.location_address || 'Unknown'),
        speed: track.speed,
        heading: track.heading,
        timestamp: new Date(track.timestamp),
        status: track.status,
        batteryLevel: track.battery_level,
        accuracy: track.accuracy
      }));

    } catch (error) {
      console.error('Error finding tracking by courier ID:', error);
      return [];
    }
  }

  async getLatestTracking(deliveryId: string): Promise<Tracking | null> {
    try {
      const { data: track, error } = await this.databaseClient
        .from('tracking')
        .select(`
          id,
          delivery_id,
          courier_id,
          location_lat,
          location_lng,
          location_address,
          speed,
          heading,
          timestamp,
          status,
          battery_level,
          accuracy
        `)
        .eq('delivery_id', deliveryId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Database query error:', error);
        return null;
      }

      if (!track) {
        return null;
      }

      // Map to domain entity
      return {
        id: track.id,
        deliveryId: track.delivery_id,
        courierId: track.courier_id,
        location: GeoPoint.create(track.location_lat, track.location_lng, track.location_address || 'Unknown'),
        speed: track.speed,
        heading: track.heading,
        timestamp: new Date(track.timestamp),
        status: track.status,
        batteryLevel: track.battery_level,
        accuracy: track.accuracy
      };

    } catch (error) {
      console.error('Error getting latest tracking:', error);
      return null;
    }
  }

  async deleteOldTracking(olderThanHours: number): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

      const { data, error } = await this.databaseClient
        .from('tracking')
        .delete()
        .lt('timestamp', cutoffTime.toISOString());

      if (error) {
        console.error('Database delete error:', error);
        return 0;
      }

      // Return the count of deleted records
      return data ? data.length : 0;

    } catch (error) {
      console.error('Error deleting old tracking:', error);
      return 0;
    }
  }
}

