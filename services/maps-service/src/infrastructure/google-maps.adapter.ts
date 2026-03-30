type Coordinates = { lat: number; lng: number };

interface GoogleMapsClient {
  geocode(address: string): Promise<{
    data: {
      results: Array<{
        geometry: { location: Coordinates };
      }>;
    };
  }>;
  directions(origin: Coordinates, destination: Coordinates): Promise<{
    data: {
      routes: Array<{
        legs: Array<{
          distance: { value: number };
          duration: { value: number };
        }>;
        overview_polyline?: { points: string };
      }>;
    };
  }>;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  distance: number;
  duration: number;
  polyline: string;
}

export class GoogleMapsAdapter {
  constructor(private readonly client: GoogleMapsClient) {}

  async geocode(address: string): Promise<GeocodeResult> {
    const response = await this.client.geocode(address);
    const location = response.data.results[0]?.geometry.location;

    if (!location) {
      throw new Error('No geocoding results found');
    }

    return {
      latitude: location.lat,
      longitude: location.lng
    };
  }

  async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    const response = await this.client.directions(origin, destination);
    const firstRoute = response.data.routes[0];
    const firstLeg = firstRoute?.legs[0];

    if (!firstRoute || !firstLeg) {
      throw new Error('No route results found');
    }

    return {
      distance: firstLeg.distance.value,
      duration: firstLeg.duration.value,
      polyline: firstRoute.overview_polyline?.points || ''
    };
  }
}
