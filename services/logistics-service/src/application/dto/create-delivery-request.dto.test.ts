import type {
  CreateDeliveryRequestDto,
  CreateDeliveryResponseDto
} from './create-delivery-request.dto';

describe('create-delivery-request DTO contracts', () => {
  it('supports create delivery request payloads', () => {
    const requestDto: CreateDeliveryRequestDto = {
      orderId: 'order-1',
      pickupLocation: {
        lat: -6.7924,
        lng: 39.2083,
        address: 'Dar es Salaam CBD'
      },
      deliveryLocation: {
        lat: -6.8156,
        lng: 39.2862,
        address: 'Mikocheni'
      },
      weight: 2.5,
      priority: 'express',
      specialRequirements: ['fragile'],
      customerInfo: {
        name: 'Amina',
        phone: '+255712345678'
      }
    };

    expect(requestDto.priority).toBe('express');
    expect(requestDto.pickupLocation.address).toContain('Dar es Salaam');
  });

  it('supports create delivery response payloads', () => {
    const responseDto: CreateDeliveryResponseDto = {
      success: true,
      deliveryId: 'del-1',
      courierId: 'courier-1',
      estimatedDeliveryTime: new Date('2026-03-10T15:00:00.000Z'),
      totalCost: 9000
    };

    expect(responseDto.success).toBe(true);
    expect(responseDto.totalCost).toBe(9000);
  });
});
