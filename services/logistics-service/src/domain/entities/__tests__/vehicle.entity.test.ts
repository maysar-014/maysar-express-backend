/**
 * Vehicle + VehicleTariff entity unit tests (Phase 2 §2.3)
 */

import { Vehicle, makeVehicleId } from '../vehicle.entity';
import { VehicleTariff } from '../vehicle-tariff.entity';

function makeVehicle(overrides: Record<string, any> = {}): Vehicle {
  return Vehicle.create({
    driverId: 'drv_1',
    vehicleType: 'MOTORCYCLE',
    maxWeightKg: 25,
    maxVolumeM3: null,
    cargoDimensions: null,
    servesAreas: ['Kinondoni'],
    operatingHours: [{ dayOfWeek: 1, startHour: 8, endHour: 18 }],
    hasRefrigeration: false,
    handlesFragile: true,
    isActive: true,
    ...overrides,
  });
}

function makeTariff(overrides: Record<string, any> = {}): VehicleTariff {
  return VehicleTariff.create({
    vehicleId: 'VHL_1',
    baseOperatingCostTzs: 2000,
    costPerKmTzs: 500,
    costPerHourTzs: 12000,
    minimumJobCompensationTzs: 3000,
    ...overrides,
  });
}

describe('Vehicle entity', () => {
  it('creates with sane defaults and a VHL- prefix id', () => {
    const v = makeVehicle();
    expect(v.id).toMatch(/^VHL_/);
    expect(v.vehicleType).toBe('MOTORCYCLE');
    expect(v.isActive).toBe(true);
    expect(v.handlesFragile).toBe(true);
    expect(v.operatingHours).toEqual([{ dayOfWeek: 1, startHour: 8, endHour: 18 }]);
  });

  it('mints unique ids', () => {
    expect(makeVehicleId()).not.toBe(makeVehicleId());
  });

  it('rejects unknown vehicle types and non-positive weight', () => {
    expect(() => makeVehicle({ vehicleType: 'HOVERBOARD' })).toThrow(/unknown vehicleType/);
    expect(() => makeVehicle({ maxWeightKg: 0 })).toThrow(/maxWeightKg must be > 0/);
  });

  it('rejects invalid operating hours', () => {
    expect(() => makeVehicle({ operatingHours: [{ dayOfWeek: 9, startHour: 0, endHour: 12 }] })).toThrow(/dayOfWeek/);
    expect(() => makeVehicle({ operatingHours: [{ dayOfWeek: 1, startHour: 14, endHour: 9 }] })).toThrow(/operating hours/);
  });
});

describe('VehicleTariff entity', () => {
  it('creates with version 1 by default', () => {
    expect(makeTariff().version).toBe(1);
  });

  it('honours an explicit nextVersion (monotonic bump)', () => {
    expect(makeTariff({ nextVersion: 3 }).version).toBe(3);
  });

  it('rejects negative rates', () => {
    expect(() => makeTariff({ costPerKmTzs: -1 })).toThrow(/cannot be negative/);
    expect(() => makeTariff({ minimumJobCompensationTzs: -5 })).toThrow(/cannot be negative/);
  });

  it('defaults loading/unloading/waiting to zero', () => {
    const t = makeTariff();
    expect(t.loadingFeeTzs).toBe(0);
    expect(t.unloadingFeeTzs).toBe(0);
    expect(t.waitingRateTzsPerMinute).toBe(0);
    expect(t.freeWaitMinutes).toBe(0);
  });
});