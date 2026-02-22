import { Location } from '../location.value-object';

describe('Location Value Object', () => {
  it('should create valid location', () => {
    const location = Location.create({
      latitude: 40.7128,
      longitude: -74.0060
    });
    expect(location.getLatitude()).toBe(40.7128);
    expect(location.getLongitude()).toBe(-74.0060);
  });

  it('should reject invalid latitude', () => {
    expect(() => Location.create({
      latitude: 91,
      longitude: 0
    })).toThrow('Invalid latitude');
  });

  it('should reject invalid longitude', () => {
    expect(() => Location.create({
      latitude: 0,
      longitude: 181
    })).toThrow('Invalid longitude');
  });

  it('should calculate distance', () => {
    const loc1 = Location.create({ latitude: 40.7128, longitude: -74.0060 });
    const loc2 = Location.create({ latitude: 34.0522, longitude: -118.2437 });
    const distance = loc1.distanceTo(loc2);
    expect(distance).toBeGreaterThan(0);
  });
});
