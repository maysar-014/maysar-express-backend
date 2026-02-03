export interface DeliveryEvent {
  eventId: string;
  eventType: 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';
  timestamp: Date;
  location?: { lat: number; lng: number };
  description: string;
  metadata?: Record<string, any>;
}

export interface Interaction {
  interactionId: string;
  type: 'call' | 'message' | 'note' | 'complaint' | 'feedback';
  timestamp: Date;
  content: string;
  initiatedBy: 'courier' | 'customer' | 'system';
}

export interface StatusChange {
  from: string;
  to: string;
  timestamp: Date;
  reason?: string;
  triggeredBy: string;
}

export interface CompletionData {
  completedAt?: Date;
  deliveryTime: number; // minutes
  customerSatisfaction?: number;
  issues: string[];
  rating?: number;
}

export interface DeliveryHistory {
  deliveryId: string;
  courierId: string;
  timeline: DeliveryEvent[];
  customerInteractions: Interaction[];
  statusTransitions: StatusChange[];
  completionMetrics: CompletionData;
}

export class DeliveryHistoryEngine {
  private readonly MAX_PROCESSING_TIME = 8; // ms

  async trackDeliveryEvent(deliveryId: string, event: DeliveryEvent): Promise<void> {
    // Store event in database
    console.log(`Tracking event ${event.eventType} for delivery ${deliveryId}`);
  }

  async getDeliveryHistory(deliveryId: string): Promise<DeliveryHistory> {
    // Simulate delivery history retrieval
    return {
      deliveryId,
      courierId: 'courier_001',
      timeline: [
        {
          eventId: 'evt_001',
          eventType: 'created',
          timestamp: new Date(Date.now() - 3600000),
          description: 'Delivery created and assigned to courier'
        },
        {
          eventId: 'evt_002',
          eventType: 'picked_up',
          timestamp: new Date(Date.now() - 1800000),
          location: { lat: -6.7924, lng: 39.2083 },
          description: 'Package picked up from sender'
        }
      ],
      customerInteractions: [
        {
          interactionId: 'int_001',
          type: 'call',
          timestamp: new Date(Date.now() - 900000),
          content: 'Customer called to confirm delivery address',
          initiatedBy: 'customer'
        }
      ],
      statusTransitions: [
        {
          from: 'created',
          to: 'assigned',
          timestamp: new Date(Date.now() - 3600000),
          triggeredBy: 'system'
        },
        {
          from: 'assigned',
          to: 'picked_up',
          timestamp: new Date(Date.now() - 1800000),
          triggeredBy: 'courier_001'
        }
      ],
      completionMetrics: {
        deliveryTime: 45,
        issues: [],
        customerSatisfaction: 4.5
      }
    };
  }

  async getDeliveryTimeline(deliveryId: string): Promise<DeliveryEvent[]> {
    const history = await this.getDeliveryHistory(deliveryId);
    return history.timeline;
  }

  async addCustomerInteraction(deliveryId: string, interaction: Interaction): Promise<void> {
    console.log(`Adding interaction for delivery ${deliveryId}: ${interaction.type}`);
  }

  async updateDeliveryStatus(deliveryId: string, from: string, to: string, triggeredBy: string): Promise<void> {
    const statusChange: StatusChange = {
      from,
      to,
      timestamp: new Date(),
      triggeredBy
    };
    console.log(`Status updated for delivery ${deliveryId}: ${from} → ${to}`);
  }
}