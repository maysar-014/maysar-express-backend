import { DeliveryEntity, DeliveryStatus } from '../delivery.entity';

describe('DeliveryEntity', () => {
  const mockPickupAddress = {
    street: '123 Pickup St',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    coordinates: { lat: -6.7924, lng: 39.2083 },
    contactName: 'Seller Name',
    contactPhone: '+255712345678'
  };

  const mockDeliveryAddress = {
    street: '456 Delivery Ave',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    coordinates: { lat: -6.8000, lng: 39.2800 },
    contactName: 'Buyer Name',
    contactPhone: '+255787654321'
  };

  const mockPackage = {
    weight: 2.5,
    dimensions: { length: 30, width: 20, height: 10 },
    value: 50000,
    fragile: false,
    perishable: false,
    items: [{ name: 'Product', quantity: 1, value: 50000 }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignCourier', () => {
    it('should assign courier to pending delivery', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending');
      
      delivery.assignCourier('courier-1');

      expect(delivery.courierId).toBe('courier-1');
      expect(delivery.status).toBe('assigned');
      expect(delivery.timestamps.assigned).toBeInstanceOf(Date);
    });

    it('should throw error when assigning to non-pending delivery', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'assigned');
      
      expect(() => delivery.assignCourier('courier-1')).toThrow('Cannot assign courier');
    });
  });

  describe('status transitions', () => {
    it('should transition through delivery lifecycle', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending');
      
      delivery.assignCourier('courier-1');
      expect(delivery.status).toBe('assigned');

      delivery.markAsPickedUp();
      expect(delivery.status).toBe('picked_up');

      delivery.markAsInTransit();
      expect(delivery.status).toBe('in_transit');

      delivery.markAsOutForDelivery();
      expect(delivery.status).toBe('out_for_delivery');

      delivery.markAsDelivered();
      expect(delivery.status).toBe('delivered');
      expect(delivery.actualDeliveryTime).toBeInstanceOf(Date);
    });

    it('should prevent invalid transitions', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending');
      
      expect(() => delivery.markAsPickedUp()).toThrow('Cannot mark as picked up');
    });
  });

  describe('markAsFailed', () => {
    it('should mark delivery as failed with reason', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'assigned');
      
      delivery.markAsFailed('Address not found');

      expect(delivery.status).toBe('failed');
      expect(delivery.notes).toBe('Address not found');
      expect(delivery.timestamps.failed).toBeInstanceOf(Date);
    });

    it('should not allow failing delivered delivery', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'delivered');
      
      expect(() => delivery.markAsFailed('Test')).toThrow('Cannot mark as failed');
    });
  });

  describe('cancel', () => {
    it('should cancel active delivery', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'assigned');
      
      delivery.cancel('Customer requested cancellation');

      expect(delivery.status).toBe('cancelled');
      expect(delivery.notes).toBe('Customer requested cancellation');
    });

    it('should not allow cancelling delivered delivery', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'delivered');
      
      expect(() => delivery.cancel('Test')).toThrow('Cannot cancel delivery');
    });
  });

  describe('isCompleted', () => {
    it('should return true for terminal states', () => {
      expect(new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'delivered').isCompleted()).toBe(true);
      expect(new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'failed').isCompleted()).toBe(true);
      expect(new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'cancelled').isCompleted()).toBe(true);
    });

    it('should return false for active states', () => {
      expect(new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending').isCompleted()).toBe(false);
      expect(new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'in_transit').isCompleted()).toBe(false);
    });
  });

  describe('getDeliveryDuration', () => {
    it('should calculate duration when delivered', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending');
      delivery.assignCourier('courier-1');
      
      setTimeout(() => {
        delivery.markAsPickedUp();
        delivery.markAsInTransit();
        delivery.markAsOutForDelivery();
        delivery.markAsDelivered();
        
        const duration = delivery.getDeliveryDuration();
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });

    it('should return null when not delivered', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending');
      expect(delivery.getDeliveryDuration()).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate correct delivery', () => {
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, mockPackage, 'pending');
      const result = delivery.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid package weight', () => {
      const invalidPackage = { ...mockPackage, weight: 0 };
      const delivery = new DeliveryEntity('del-1', 'order-1', mockPickupAddress, mockDeliveryAddress, invalidPackage, 'pending');
      
      const result = delivery.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Package weight must be positive');
    });
  });
});
