import { GoogleMapsAdapter } from '../google-maps.adapter';

const mockClient = {
  geocode: jest.fn(),
  directions: jest.fn()
} as any;

describe('GoogleMapsAdapter', () => {
  let adapter: GoogleMapsAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GoogleMapsAdapter(mockClient);
  });

  it('should geocode address', async () => {
    mockClient.geocode.mockResolvedValue({
      data: {
        results: [{
          geometry: {
            location: { lat: 40.7128, lng: -74.0060 }
          }
        }]
      }
    });

    const result = await adapter.geocode('123 Main St');

    expect(result.latitude).toBe(40.7128);
    expect(result.longitude).toBe(-74.0060);
  });

  it('should calculate route', async () => {
    mockClient.directions.mockResolvedValue({
      data: {
        routes: [{
          legs: [{
            distance: { value: 100000 },
            duration: { value: 3600 }
          }]
        }]
      }
    });

    const result = await adapter.calculateRoute(
      { lat: 40.7128, lng: -74.0060 },
      { lat: 34.0522, lng: -118.2437 }
    );

    expect(result.distance).toBe(100000);
  });
});
