import { IRouteRepository } from '../../domain/repositories';
import { Route } from '../../domain/entities/route.entity';
import { RouteStatus } from '../../domain/enums/route-status.enum';
import { RouteProgress } from '../../domain/value-objects/route-progress.value-object';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class RouteRepository implements IRouteRepository {
  constructor(private databaseClient: any) { }

  async save(route: Route): Promise<void> {
    try {
      const routeData = {
        id: route.getId(),
        courier_id: route.getCourierId(),
        status: route.getStatus(),
        total_distance: route.getTotalDistance(),
        estimated_duration: route.getEstimatedDuration(),
        actual_duration: route.getActualDuration(),
        waypoints: route.getWaypoints().map(wp => ({
          lat: wp.getCoordinates().lat,
          lng: wp.getCoordinates().lng,
          address: wp.getAddress()
        })),
        progress: {
          completed_stops: route.getProgress().getCompletedStops(),
          total_stops: route.getProgress().getTotalStops(),
          current_lat: route.getProgress().getCurrentLocation().getCoordinates().lat,
          current_lng: route.getProgress().getCurrentLocation().getCoordinates().lng,
          current_address: route.getProgress().getCurrentLocation().getAddress(),
          last_update_time: route.getProgress().getLastUpdateTime().toISOString(),
          estimated_completion_time: route.getProgress().getEstimatedCompletionTime()?.toISOString(),
          notes: route.getProgress().getNotes()
        },
        created_at: route.getCreatedAt().toISOString(),
        updated_at: route.getUpdatedAt().toISOString(),
        completed_at: route.getCompletedAt()?.toISOString()
      };

      const { error } = await this.databaseClient
        .from('routes')
        .upsert(routeData, { onConflict: 'id' });

      if (error) {
        console.error('Database upsert error:', error);
        throw new Error('Failed to save route to database');
      }

    } catch (error) {
      console.error('Error saving route:', error);
      throw new Error('Failed to save route');
    }
  }

  async findById(id: string): Promise<Route | null> {
    try {
      const { data: routeData, error } = await this.databaseClient
        .from('routes')
        .select(`
          id,
          courier_id,
          status,
          total_distance,
          estimated_duration,
          actual_duration,
          waypoints,
          progress,
          created_at,
          updated_at,
          completed_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Database query error:', error);
        throw new Error('Failed to query route');
      }

      if (!routeData) {
        return null;
      }

      // Convert database data to domain entities
      const waypoints = routeData.waypoints.map((wp: any) =>
        GeoPoint.create(wp.lat, wp.lng, wp.address)
      );

      const progress = RouteProgress.fromDatabase(routeData.progress);

      return Route.create({
        id: routeData.id,
        courierId: routeData.courier_id,
        status: routeData.status,
        totalDistance: routeData.total_distance,
        estimatedDuration: routeData.estimated_duration,
        waypoints,
        progress,
        createdAt: new Date(routeData.created_at),
        updatedAt: new Date(routeData.updated_at)
      });

    } catch (error) {
      console.error('Error finding route by ID:', error);
      throw new Error('Failed to find route');
    }
  }

  async findByCourierId(courierId: string, status?: RouteStatus): Promise<Route[]> {
    try {
      let query = this.databaseClient
        .from('routes')
        .select(`
          id,
          courier_id,
          status,
          total_distance,
          estimated_duration,
          actual_duration,
          waypoints,
          progress,
          created_at,
          updated_at,
          completed_at
        `)
        .eq('courier_id', courierId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('created_at', { ascending: false });

      const { data: routesData, error } = await query;

      if (error) {
        console.error('Database query error:', error);
        throw new Error('Failed to query routes by courier');
      }

      if (!routesData || routesData.length === 0) {
        return [];
      }

      // Convert database data to domain entities
      return routesData.map((routeData: any) => {
        const waypoints = routeData.waypoints.map((wp: any) =>
          GeoPoint.create(wp.lat, wp.lng, wp.address)
        );

        const progress = RouteProgress.fromDatabase(routeData.progress);

        return Route.create({
          id: routeData.id,
          courierId: routeData.courier_id,
          status: routeData.status,
          totalDistance: routeData.total_distance,
          estimatedDuration: routeData.estimated_duration,
          waypoints,
          progress,
          createdAt: new Date(routeData.created_at),
          updatedAt: new Date(routeData.updated_at)
        });
      });

    } catch (error) {
      console.error('Error finding routes by courier ID:', error);
      throw new Error('Failed to find routes by courier');
    }
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: RouteStatus;
    courierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ routes: Route[]; total: number }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const offset = (page - 1) * limit;

      let query = this.databaseClient
        .from('routes')
        .select(`
          id,
          courier_id,
          status,
          total_distance,
          estimated_duration,
          actual_duration,
          waypoints,
          progress,
          created_at,
          updated_at,
          completed_at
        `, { count: 'exact' });

      // Apply filters
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.courierId) {
        query = query.eq('courier_id', options.courierId);
      }
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom.toISOString());
      }
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo.toISOString());
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: routesData, error, count } = await query;

      if (error) {
        console.error('Database query error:', error);
        throw new Error('Failed to query routes');
      }

      if (!routesData || routesData.length === 0) {
        return { routes: [], total: 0 };
      }

      // Convert database data to domain entities
      const routes = routesData.map((routeData: any) => {
        const waypoints = routeData.waypoints.map((wp: any) =>
          GeoPoint.create(wp.lat, wp.lng, wp.address)
        );

        const progress = RouteProgress.fromDatabase(routeData.progress);

        return Route.create({
          id: routeData.id,
          courierId: routeData.courier_id,
          status: routeData.status,
          totalDistance: routeData.total_distance,
          estimatedDuration: routeData.estimated_duration,
          waypoints,
          progress,
          createdAt: new Date(routeData.created_at),
          updatedAt: new Date(routeData.updated_at)
        });
      });

      return {
        routes,
        total: count || 0
      };

    } catch (error) {
      console.error('Error finding all routes:', error);
      throw new Error('Failed to find routes');
    }
  }

  async updateRoute(id: string, updates: Partial<Route>): Promise<Route> {
    try {
      // First get the current route
      const currentRoute = await this.findById(id);
      if (!currentRoute) {
        throw new Error(`Route with ID ${id} not found`);
      }

      const updatePayload: any = updates as any;

      const updatedRoute = Route.fromDatabase({
        id: currentRoute.getId(),
        courier_id: updatePayload.courierId || currentRoute.getCourierId(),
        status: updatePayload.getStatus ? updatePayload.getStatus() : updatePayload.status || currentRoute.getStatus(),
        total_distance: updatePayload.totalDistance || currentRoute.getTotalDistance(),
        estimated_duration: updatePayload.estimatedDuration || currentRoute.getEstimatedDuration(),
        actual_duration: updatePayload.actualDuration || currentRoute.getActualDuration(),
        waypoints: updatePayload.getWaypoints ? updatePayload.getWaypoints() : updatePayload.waypoints || currentRoute.getWaypoints(),
        progress: updatePayload.getProgress ? updatePayload.getProgress() : updatePayload.progress || currentRoute.getProgress(),
        created_at: currentRoute.getCreatedAt(),
        updated_at: new Date(),
        completed_at: updatePayload.completedAt || currentRoute.getCompletedAt()
      });

      const routeData = {
        courier_id: updatedRoute.getCourierId(),
        status: updatedRoute.getStatus(),
        total_distance: updatedRoute.getTotalDistance(),
        estimated_duration: updatedRoute.getEstimatedDuration(),
        actual_duration: updatedRoute.getActualDuration(),
        waypoints: updatedRoute.getWaypoints().map(wp => ({
          lat: wp.getCoordinates().lat,
          lng: wp.getCoordinates().lng,
          address: wp.getAddress()
        })),
        progress: {
          completed_stops: updatedRoute.getProgress().getCompletedStops(),
          total_stops: updatedRoute.getProgress().getTotalStops(),
          current_lat: updatedRoute.getProgress().getCurrentLocation().getCoordinates().lat,
          current_lng: updatedRoute.getProgress().getCurrentLocation().getCoordinates().lng,
          current_address: updatedRoute.getProgress().getCurrentLocation().getAddress(),
          last_update_time: updatedRoute.getProgress().getLastUpdateTime().toISOString(),
          estimated_completion_time: updatedRoute.getProgress().getEstimatedCompletionTime()?.toISOString(),
          notes: updatedRoute.getProgress().getNotes()
        },
        updated_at: updatedRoute.getUpdatedAt().toISOString(),
        completed_at: updatedRoute.getCompletedAt()?.toISOString()
      };

      if (this.databaseClient.route?.update) {
        await this.databaseClient.route.update({
          where: { id },
          data: routeData
        });
      } else {
        const { error } = await this.databaseClient
          .from('routes')
          .update(routeData)
          .eq('id', id);

        if (error) {
          console.error('Database update error:', error);
          throw new Error('Failed to update route in database');
        }
      }

      return updatedRoute;

    } catch (error) {
      console.error('Error updating route:', error);
      throw new Error('Failed to update route');
    }
  }

  async deleteRoute(id: string): Promise<void> {
    try {
      const { error } = await this.databaseClient
        .from('routes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database delete error:', error);
        throw new Error('Failed to delete route');
      }

    } catch (error) {
      console.error('Error deleting route:', error);
      throw new Error('Failed to delete route');
    }
  }
}

