type Coordinates = { lat: number; lng: number };

export interface RouteResult {
  distance: number;
  duration: number;
  polyline: string;
}

export interface RouteAdapter {
  calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;
}

export interface CalculateRouteInput {
  origin: Coordinates;
  destination: Coordinates;
}

export class CalculateRouteUseCase {
  constructor(private readonly adapter: RouteAdapter) {}

  async execute(input: CalculateRouteInput): Promise<RouteResult> {
    return this.adapter.calculateRoute(input.origin, input.destination);
  }
}
