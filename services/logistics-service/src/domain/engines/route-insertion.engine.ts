/**
 * RouteInsertionEngine (Phase 5 §5.2)
 *
 * Evaluates inserting a new Shipment into an existing active DeliveryJob's
 * route. PURE — no I/O, no async.
 *
 *   marginalCost = cost(route_with_new_stop) − cost(current_route)
 *
 * Feasible when: vehicle capacity permits AND vehicle class is compatible
 * AND marginalCost < insertionCostThreshold (configurable).
 * Results are recorded as Logistics_RouteInsertionCandidate rows by the
 * calling use case so optimization quality can be analysed retrospectively.
 */

export interface RouteStop {
  lat: number;
  lng: number;
}

export interface InsertionShipment {
  shipmentId: string;
  pickup: RouteStop;
  drop: RouteStop;
  weightKg: number;
  requiredVehicleClass: string | null;
}

export interface InsertionVehicle {
  vehicleType: string;
  maxWeightKg: number;
  /** Weight already committed on this job (sum of its shipments). */
  committedWeightKg: number;
}

export interface InsertionTariff {
  costPerKmTzs: number;
  costPerHourTzs: number;
  loadingFeeTzs: number;
  unloadingFeeTzs: number;
}

export interface InsertionInput {
  /** Current route in visit order: pickup(s) first, then the buyer drop. */
  currentRoute: RouteStop[];
  shipment: InsertionShipment;
  vehicle: InsertionVehicle;
  tariff: InsertionTariff;
  /** Configurable threshold — insertions costing more are recorded but infeasible. */
  insertionCostThresholdTzs: number;
}

export interface InsertionEvaluation {
  shipmentId: string;
  feasible: boolean;
  marginalCostTzs: number;
  additionalDistanceKm: number;
  additionalDurationMinutes: number;
  rejectionReason: 'CAPACITY' | 'THRESHOLD' | 'VEHICLE_CLASS' | null;
}

/** Road-factor applied to straight-line legs (consistent with codebase fallback). */
export const ROAD_DETOUR_FACTOR = 1.35;
/** Average urban speed in km/h used to convert distance to minutes. */
const AVG_SPEED_KMH = 30;

export class RouteInsertionEngine {
  evaluate(input: InsertionInput): InsertionEvaluation {
    const { currentRoute, shipment, vehicle, tariff } = input;

    // Hard feasibility first (backlog rule 8) — capacity and class.
    if (shipment.requiredVehicleClass && vehicle.vehicleType !== shipment.requiredVehicleClass) {
      return this.result(input, 0, 0, 0, 'VEHICLE_CLASS');
    }
    if (vehicle.committedWeightKg + shipment.weightKg > vehicle.maxWeightKg) {
      return this.result(input, 0, 0, 0, 'CAPACITY');
    }

    // Route-with-stop: cheapest insertion point is appending the pickup before
    // the final drop (pickup-then-drop preserves LIFO loading for the new pkg).
    const base = currentRoute.slice(0, Math.max(currentRoute.length - 1, 0));
    const finalDrop = currentRoute[currentRoute.length - 1] ?? shipment.drop;
    const routeWithStop: RouteStop[] =
      base.length > 0
        ? [...base, shipment.pickup, finalDrop]
        : [shipment.pickup, shipment.drop];

    const costWith = this.routeCost(routeWithStop, tariff);
    const costWithout = currentRoute.length >= 2 ? this.routeCost(currentRoute, tariff) : 0;
    const marginalCost = Math.max(0, costWith - costWithout);

    const additionalDistanceKm = Math.max(
      0,
      this.routeDistance(routeWithStop) - (currentRoute.length >= 2 ? this.routeDistance(currentRoute) : 0),
    );
    const additionalDurationMinutes = (additionalDistanceKm / AVG_SPEED_KMH) * 60;

    if (marginalCost >= input.insertionCostThresholdTzs) {
      return this.result(input, marginalCost, additionalDistanceKm, additionalDurationMinutes, 'THRESHOLD');
    }

    return {
      shipmentId: shipment.shipmentId,
      feasible: true,
      marginalCostTzs: Math.round(marginalCost),
      additionalDistanceKm: Math.round(additionalDistanceKm * 100) / 100,
      additionalDurationMinutes: Math.round(additionalDurationMinutes),
      rejectionReason: null,
    };
  }

  /** Tariff-driven route cost: distance + time, straight-line legs with road factor. */
  private routeCost(route: RouteStop[], tariff: InsertionTariff): number {
    const km = this.routeDistance(route);
    const minutes = (km / AVG_SPEED_KMH) * 60;
    return (
      km * tariff.costPerKmTzs +
      (minutes / 60) * tariff.costPerHourTzs +
      tariff.loadingFeeTzs +
      tariff.unloadingFeeTzs
    );
  }

  private routeDistance(route: RouteStop[]): number {
    let km = 0;
    for (let i = 1; i < route.length; i++) {
      km += this.haversineKm(route[i - 1], route[i]);
    }
    return km * ROAD_DETOUR_FACTOR;
  }

  private haversineKm(a: RouteStop, b: RouteStop): number {
    const R = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(a.lat)) * Math.cos(this.toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private result(
    input: InsertionInput,
    marginalCost: number,
    km: number,
    minutes: number,
    reason: InsertionEvaluation['rejectionReason'],
  ): InsertionEvaluation {
    return {
      shipmentId: input.shipment.shipmentId,
      feasible: false,
      marginalCostTzs: Math.round(marginalCost),
      additionalDistanceKm: Math.round(km * 100) / 100,
      additionalDurationMinutes: Math.round(minutes),
      rejectionReason: reason,
    };
  }
}
