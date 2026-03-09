import { DeliveryMapper } from './delivery.mapper';
import type { CreateDeliveryOutput } from '../use-cases/create-delivery.use-case';

describe('DeliveryMapper', () => {
  it('maps create-delivery request dto to use-case input', () => {
    const input = DeliveryMapper.toCreateDeliveryInput({
      orderId: 'order-1',
      pickupLocation: { lat: -6.7924, lng: 39.2083, address: 'Dar es Salaam' },
      deliveryLocation: { lat: -6.8156, lng: 39.2862, address: 'Mikocheni' },
      weight: 1.5,
      priority: 'express',
      specialRequirements: ['fragile']
    });

    expect(input.orderId).toBe('order-1');
    expect(input.priority).toBe('express');
    expect(input.pickupLocation.address).toContain('Dar es Salaam');
  });

  it('maps successful and error use-case outputs to response dto', () => {
    const output: CreateDeliveryOutput = {
      deliveryId: 'del-1',
      courierId: 'courier-1',
      courierName: 'Amina',
      estimatedPickupTime: new Date('2026-03-10T09:00:00.000Z'),
      estimatedDeliveryTime: new Date('2026-03-10T10:00:00.000Z'),
      totalCost: 9000,
      route: {
        distance: 12.2,
        duration: 35,
        waypoints: [
          { lat: -6.79, lng: 39.20, type: 'pickup' },
          { lat: -6.81, lng: 39.28, type: 'delivery' }
        ]
      }
    };

    const success = DeliveryMapper.toCreateDeliveryResponseDto(output);
    const failure = DeliveryMapper.toCreateDeliveryResponseDtoFromError(new Error('No courier available'));

    expect(success.success).toBe(true);
    expect(success.deliveryId).toBe('del-1');
    expect(failure.success).toBe(false);
    expect(failure.error).toBe('No courier available');
  });

  it('creates domain helper value objects and validates primitives', () => {
    expect(DeliveryMapper.createGeoPoint(-6.79, 39.2, 'Point A').getCoordinates().lat).toBe(-6.79);
    expect(DeliveryMapper.createWeight(2).toKilograms()).toBe(2);

    const now = new Date();
    const timeWindow = DeliveryMapper.createTimeWindow(
      new Date(now.getTime() + 60 * 60 * 1000),
      new Date(now.getTime() + 2 * 60 * 60 * 1000)
    );
    expect(timeWindow.getDurationHours()).toBe(1);

    expect(DeliveryMapper.validateCoordinates(-6.79, 39.2)).toBe(true);
    expect(DeliveryMapper.validateCoordinates(-200, 39.2)).toBe(false);
    expect(DeliveryMapper.validateWeight(10)).toBe(true);
    expect(DeliveryMapper.validateWeight(0)).toBe(false);
    expect(DeliveryMapper.validatePriority('urgent')).toBe(true);
    expect(DeliveryMapper.validatePriority('invalid')).toBe(false);
  });
});
