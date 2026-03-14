import {
  DeliveryEvent,
  DeliveryHistoryEngine,
  Interaction
} from './delivery-history.engine';

describe('DeliveryHistoryEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a structured delivery history', async () => {
    const engine = new DeliveryHistoryEngine();

    const history = await engine.getDeliveryHistory('delivery-1');

    expect(history.deliveryId).toBe('delivery-1');
    expect(history.timeline.length).toBeGreaterThan(0);
    expect(history.customerInteractions.length).toBeGreaterThan(0);
    expect(history.statusTransitions.length).toBeGreaterThan(0);
    expect(history.completionMetrics.deliveryTime).toBeGreaterThan(0);
  });

  it('returns timeline from getDeliveryHistory', async () => {
    const engine = new DeliveryHistoryEngine();
    const timeline: DeliveryEvent[] = [
      {
        eventId: 'evt-custom',
        eventType: 'in_transit',
        timestamp: new Date(),
        description: 'On route'
      }
    ];
    const historySpy = jest.spyOn(engine, 'getDeliveryHistory').mockResolvedValue({
      deliveryId: 'delivery-2',
      courierId: 'courier-2',
      timeline,
      customerInteractions: [],
      statusTransitions: [],
      completionMetrics: { deliveryTime: 12, issues: [] }
    });

    const result = await engine.getDeliveryTimeline('delivery-2');

    expect(historySpy).toHaveBeenCalledWith('delivery-2');
    expect(result).toEqual(timeline);
  });

  it('logs tracking, interactions, and status updates without throwing', async () => {
    const engine = new DeliveryHistoryEngine();
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const interaction: Interaction = {
      interactionId: 'int-1',
      type: 'message',
      timestamp: new Date(),
      content: 'Customer requested ETA',
      initiatedBy: 'customer'
    };

    await expect(
      engine.trackDeliveryEvent('delivery-3', {
        eventId: 'evt-1',
        eventType: 'assigned',
        timestamp: new Date(),
        description: 'Assigned to courier'
      })
    ).resolves.toBeUndefined();

    await expect(engine.addCustomerInteraction('delivery-3', interaction)).resolves.toBeUndefined();
    await expect(
      engine.updateDeliveryStatus('delivery-3', 'assigned', 'in_transit', 'courier-3')
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tracking event assigned'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Adding interaction for delivery'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Status updated for delivery'));
  });
});
