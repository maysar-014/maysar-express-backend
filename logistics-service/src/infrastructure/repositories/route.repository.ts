import { RouteRepositoryPort } from '../../domain/engines/ports/route.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export interface RouteEntity {
  id: string;
  deliveryId: string;
  courierId: string;
  waypoints: GeoPoint[];
  segments: Array<{
    start: GeoPoint;
    end: GeoPoint;
    distance: number;
    duration: number;
    roadType: string;
    trafficLevel: number;
  }>;
  totalDistance: number;
  totalDuration: number;
  efficiency: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export class RouteRepository implements RouteRepositoryPort {
  constructor(private supabaseClient: any) {}

  async save(route: RouteEntity): Promise<void> {
    try {
      const routeData = {
        id: route.id,
        delivery_id: route.deliveryId,
        courier_id: route.courierId,
        waypoints: route.waypoints.map(wp => ({
          lat: wp.getCoordinates().lat,
          lng: wp.getCoordinates().lng,
          address: wp.getAddress()
        })),
        segments: route.segments.map(segment => ({
          start_lat: segment.start.getCoordinates().lat,
          start_lng: segment.start.getCoordinates().lng,
          start_address: segment.start.getAddress(),
          end_lat: segment.end.getCoordinates().lat,
          end_lng: segment.end.getCoordinates().lng,
          end_address: segment.end.getAddress(),
          distance: segment.distance,
          duration: segment.duration,
          road_type: segment.roadType,
          traffic_level: segment.trafficLevel
        })),
        total_distance: route.totalDistance,
        total_duration: route.totalDuration,
        efficiency: route.efficiency,
        confidence: route.confidence,
        created_at: route.createdAt.toISOString(),
        updated_at: route.updatedAt.toISOString()
      };

      const { error } = await this.supabaseClient
        .from('routes')
        .upsert(routeData, { onConflict: 'id' });

      if (error) {
        console.error('Supabase upsert error:', error);
        throw new Error('Failed to save route to database');
      }

    } catch (error) {
      console.error('Error saving route:', error);
      throw new Error('Failed to save route');
    }
  }

  async findByDeliveryId(deliveryId: string): Promise<RouteEntity | null> {
    try {
      const { data: route, error } = await this.supabaseClient
        .from('routes')
        .select(`
          id,
          delivery_id,
          courier_id,
          waypoints,
          segments,
          total_distance,
          total_duration,
          efficiency,
          confidence,
          created_at,
          updated_at
        `)
        .eq('delivery_id', deliveryId)
        .single();

      if (error) {
        console.error('Supabase query error:', error);
        return null;
      }

      if (!route) {
        return null;
      }

      // Map to domain entity
      return {
        id: route.id,
        deliveryId: route.delivery_id,
        courierId: route.courier_id,
        waypoints: route.waypoints.map((wp: any) =>
          GeoPoint.create(wp.lat, wp.lng, wp.address)
        ),
        segments: route.segments.map((segment: any) => ({
          start: GeoPoint.create(segment.start_lat, segment.start_lng, segment.start_address),
          end: GeoPoint.create(segment.end_lat, segment.end_lng, segment.end_address),
          distance: segment.distance,
          duration: segment.duration,
          roadType: segment.road_type,
          trafficLevel: segment.traffic_level
        })),
        totalDistance: route.total_distance,
        totalDuration: route.total_duration,
        efficiency: route.efficiency,
        confidence: route.confidence,
        createdAt: new Date(route.created_at),
        updatedAt: new Date(route.updated_at)
      };

    } catch (error) {
      console.error('Error finding route by delivery ID:', error);
      return null;
    }
  }

  async findByCourierId(courierId: string): Promise<RouteEntity[]> {
    try {
      const { data: routes, error } = await this.supabaseClient
        .from('routes')
        .select(`
          id,
          delivery_id,
          courier_id,
          waypoints,
          segments,
          total_distance,
          total_duration,
          efficiency,
          confidence,
          created_at,
          updated_at
        `)
        .eq('courier_id', courierId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        return [];
      }

      if (!routes || routes.length === 0) {
        return [];
      }

      // Map to domain entities
      return routes.map((route: any) => ({
        id: route.id,
        deliveryId: route.delivery_id,
        courierId: route.courier_id,
        waypoints: route.waypoints.map((wp: any) =>
          GeoPoint.create(wp.lat, wp.lng, wp.address)
        ),
        segments: route.segments.map((segment: any) => ({
          start: GeoPoint.create(segment.start_lat, segment.start_lng, segment.start_address),
          end: GeoPoint.create(segment.end_lat, segment.end_lng, segment.end_address),
          distance: segment.distance,
          duration: segment.duration,
          roadType: segment.road_type,
          trafficLevel: segment.traffic_level
        })),
        totalDistance: route.total_distance,
        totalDuration: route.total_duration,
        efficiency: route.efficiency,
        confidence: route.confidence,
        createdAt: new Date(route.created_at),
        updatedAt: new Date(route.updated_at)
      }));

    } catch (error) {
      console.error('Error finding routes by courier ID:', error);
      return [];
    }
  }

  async updateRoute(id: string, updates: Partial<RouteEntity>): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Map updates to database fields
      if (updates.segments) {
        updateData.segments = updates.segments.map(segment => ({
          start_lat: segment.start.getCoordinates().lat,
          start_lng: segment.start.getCoordinates().lng,
          start_address: segment.start.getAddress(),
          end_lat: segment.end.getCoordinates().lat,
          end_lng: segment.end.getCoordinates().lng,
          end_address: segment.end.getAddress(),
          distance: segment.distance,
          duration: segment.duration,
          road_type: segment.roadType,
          traffic_level: segment.trafficLevel
        }));
      }

      if (updates.totalDistance !== undefined) updateData.total_distance = updates.totalDistance;
      if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
      if (updates.efficiency !== undefined) updateData.efficiency = updates.efficiency;
      if (updates.confidence !== undefined) updateData.confidence = updates.confidence;

      const { error } = await this.supabaseClient
        .from('routes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error('Failed to update route');
      }

    } catch (error) {
      console.error('Error updating route:', error);
      throw new Error('Failed to update route');
    }
  }

  async deleteRoute(id: string): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw new Error('Failed to delete route');
      }

    } catch (error) {
      console.error('Error deleting route:', error);
      throw new Error('Failed to delete route');
    }
  }
}
