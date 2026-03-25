import { IDeliveryRepository } from '../../domain/repositories';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';

export interface UpdateDeliveryStatusInput {
  deliveryId: string;
  status: DeliveryStatus;
  location?: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  recipientName?: string;
  notes?: string;
  reason?: string;
}

export interface UpdateDeliveryStatusOutput {
  deliveryId: string;
  status: DeliveryStatus;
  previousStatus: DeliveryStatus;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  notes?: string;
  updatedAt: Date;
}

export class UpdateDeliveryStatusUseCase {
  constructor(
    private deliveryRepository: IDeliveryRepository
  ) { }

  async execute(input: UpdateDeliveryStatusInput): Promise<UpdateDeliveryStatusOutput> {
    // Get current delivery
    const currentDelivery = await this.deliveryRepository.findById(input.deliveryId);
    if (!currentDelivery) {
      throw new Error(`Delivery ${input.deliveryId} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(currentDelivery.status, input.status);

    // Update delivery status using existing repository method
    const metadata: any = {};

    // Handle additional fields for metadata
    if (input.notes) {
      metadata.notes = input.notes;
    }

    if (input.recipientName && input.status === 'delivered') {
      metadata.recipientName = input.recipientName;
    }

    if (input.reason && input.status === 'cancelled') {
      metadata.reason = input.reason;
    }

    // Update status
    await this.deliveryRepository.updateStatus(input.deliveryId, input.status, metadata);

    // Get updated delivery
    const updatedDelivery = await this.deliveryRepository.findById(input.deliveryId);
    if (!updatedDelivery) {
      throw new Error(`Failed to retrieve updated delivery ${input.deliveryId}`);
    }

    return {
      deliveryId: updatedDelivery.id,
      status: updatedDelivery.status,
      previousStatus: currentDelivery.status,
      pickedUpAt: updatedDelivery.actualPickupTime,
      deliveredAt: updatedDelivery.actualDeliveryTime,
      cancelledAt: undefined, // Not tracked in current schema
      location: undefined, // Not tracked in current schema
      notes: metadata.notes,
      updatedAt: updatedDelivery.updatedAt
    };
  }

  private validateStatusTransition(currentStatus: DeliveryStatus, newStatus: DeliveryStatus): void {
    const normalizedCurrentStatus = currentStatus === 'pending'
      ? 'assigned'
      : currentStatus;
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      'pending': ['assigned', 'cancelled', 'failed'],
      'assigned': ['picked_up', 'cancelled', 'failed'],
      'picked_up': ['in_transit', 'cancelled', 'failed'],
      'in_transit': ['delivered', 'cancelled', 'failed'],
      'delivered': [], // Terminal state
      'cancelled': [], // Terminal state
      'failed': [] // Terminal state
    };

    if (!validTransitions[normalizedCurrentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
