export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

export interface GeocodingAdapter {
  geocode(address: string): Promise<GeocodeResult>;
}

export interface GeocodeAddressInput {
  address: string;
}

export class GeocodeAddressUseCase {
  constructor(private readonly adapter: GeocodingAdapter) {}

  async execute(input: GeocodeAddressInput): Promise<GeocodeResult> {
    return this.adapter.geocode(input.address);
  }
}
