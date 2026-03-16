import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Route } from '../../domain/entities/route.entity';
import { RouteProgress } from '../../domain/value-objects/route-progress.value-object';
import { RouteStatus } from '../../domain/enums/route-status.enum';

export class RouteMapper {
  static toBasicRoute(params: {
    deliveryId: string;
    courierId: string;
    pickupPoint: GeoPoint;
    deliveryPoint: GeoPoint;
  }): Route {
    const progress = RouteProgress.create(
      0,
      2,
      params.pickupPoint,
      new Date(),
      undefined,
      undefined
    );

    return Route.create({
      id: `route_${params.deliveryId}`,
      courierId: params.courierId,
      status: RouteStatus.PLANNED,
      totalDistance: 10.0,
      estimatedDuration: 20,
      waypoints: [params.pickupPoint, params.deliveryPoint],
      progress
    });
  }
}
