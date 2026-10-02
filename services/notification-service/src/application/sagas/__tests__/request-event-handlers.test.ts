/**
 * Regression coverage for the request/quote event handlers on SagaEventHandler.
 *
 * Two defects are pinned here, both of which were silent:
 *
 *  1. `sendInAppNotification` probed `prisma.notification_Notification` and then
 *     `prisma.notification` for the model. The real model is `Notification`, and
 *     because the probes used `?.create?.` they resolved to undefined, skipped
 *     the body and returned without throwing. Every notification was dropped, and
 *     the four pre-existing order handlers looked healthy while writing nothing.
 *  2. `Notification.type` is a CHANNEL enum (email|sms|push|in_app|webhook), but
 *     semantic values such as 'ORDER_PLACED' were being written to it. Those match
 *     no enum member, so even a correct model name would have produced writes
 *     Prisma rejects.
 *
 * The tests assert the exact `create` argument, so a regression in either the
 * model name or the channel enum fails here rather than in production.
 */
import { SagaEventHandler } from '../saga-event-handler';
import { NotificationValidationService } from '../../../domain/services/notification-validation.service';

type CreateArgs = { data: Record<string, any> };

function makeHandler(overrides: { request?: Record<string, any> | null; create?: jest.Mock } = {}) {
  const create = overrides.create ?? jest.fn().mockResolvedValue({ id: 'n1' });
  const findUnique = jest.fn().mockResolvedValue(
    overrides.request === undefined
      ? { customerId: 'cust-1', assignedProviderId: 'prov-1', title: 'Bulk cement order' }
      : overrides.request,
  );

  (globalThis as any).prisma = { Notification: { create }, Request_Request: { findUnique } };

  const handler = new SagaEventHandler(
    {} as any, {} as any, {} as NotificationValidationService, jest.fn(), jest.fn(),
  );

  return {
    handler,
    create,
    findUnique,
    call: (name: string, payload: Record<string, any>) => (handler as any)[name](payload),
  };
}

const argsOf = (create: jest.Mock): CreateArgs => create.mock.calls[0][0] as CreateArgs;

afterEach(() => {
  delete (globalThis as any).prisma;
  jest.clearAllMocks();
});

describe('SagaEventHandler — persistence contract', () => {
  it('writes to the `Notification` model, not a guessed delegate name', async () => {
    const { handler, create } = makeHandler();
    await (handler as any).handleRequestSubmitted({ requestId: 'r1', customerId: 'cust-1' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('writes a valid channel enum to `type` and keeps the semantic type in `data`', async () => {
    const { handler, create } = makeHandler();
    await (handler as any).handleRequestSubmitted({ requestId: 'r1', customerId: 'cust-1' });

    const { data } = argsOf(create);
    expect(data.type).toBe('in_app');
    expect(['email', 'sms', 'push', 'in_app', 'webhook']).toContain(data.type);
    // The semantic category must not be smuggled into the channel enum.
    expect(data.type).not.toBe('REQUEST_SUBMITTED');
    expect(data.data.notificationType).toBe('REQUEST_SUBMITTED');
  });

  it('never writes a non-existent `channel` column', async () => {
    const { handler, create } = makeHandler();
    await (handler as any).handleRequestSubmitted({ requestId: 'r1', customerId: 'cust-1' });
    expect(argsOf(create).data).not.toHaveProperty('channel');
  });
});

describe('SagaEventHandler — request event handlers', () => {
  it('request.submitted notifies the customer named in the payload', async () => {
    const { create, call } = makeHandler();
    await call('handleRequestSubmitted', { requestId: 'r1', customerId: 'cust-9' });
    expect(argsOf(create).data.userId).toBe('cust-9');
  });

  it('request.needs_clarification resolves the customer from the request row', async () => {
    const { create, call } = makeHandler();
    // No customerId in the payload — the handler must read Request_Request.
    await call('handleRequestNeedsClarification', { requestId: 'r1', providerId: 'prov-1' });
    expect(argsOf(create).data.userId).toBe('cust-1');
    expect(argsOf(create).data.priority).toBe('high');
  });

  it('request.cancelled notifies the ASSIGNED PROVIDER, not the customer', async () => {
    const { create, call } = makeHandler();
    await call('handleRequestCancelled', { requestId: 'r1', customerId: 'cust-1' });
    expect(argsOf(create).data.userId).toBe('prov-1');
    expect(argsOf(create).data.data.notificationType).toBe('REQUEST_CANCELLED');
  });

  it('request.cancelled is a no-op when no provider was assigned', async () => {
    const { create, call } = makeHandler({
      request: { customerId: 'cust-1', assignedProviderId: null, title: 'x' },
    });
    await call('handleRequestCancelled', { requestId: 'r1', customerId: 'cust-1' });
    expect(create).not.toHaveBeenCalled();
  });

  it('request.unfulfillable surfaces the reason in the copy', async () => {
    const { create, call } = makeHandler();
    await call('handleRequestUnfulfillable', { requestId: 'r1', reason: 'no local stock' });
    expect(argsOf(create).data.content).toContain('no local stock');
  });

  it('request.fulfillable and request.assessing both reach the customer', async () => {
    const a = makeHandler();
    await a.call('handleRequestFulfillable', { requestId: 'r1' });
    expect(argsOf(a.create).data.userId).toBe('cust-1');

    const b = makeHandler();
    await b.call('handleRequestAssessing', { requestId: 'r1', providerId: 'prov-1' });
    expect(argsOf(b.create).data.userId).toBe('cust-1');
  });

  it('supplier.invite_recommended uses discoveredViaRequestId to find the customer', async () => {
    const { create, call, findUnique } = makeHandler();
    await call('handleSupplierInviteRecommended', {
      supplierId: 's1',
      discoveredViaRequestId: 'r77',
      supplierName: 'Kilombero Cement',
    });

    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r77' } }));
    expect(argsOf(create).data.userId).toBe('cust-1');
  });

  it('supplier.invite_recommended with no linked request notifies nobody', async () => {
    const { create, call } = makeHandler();
    await call('handleSupplierInviteRecommended', { supplierId: 's1' });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('SagaEventHandler — quote event handlers', () => {
  it('quote.published notifies the customer with a link to the quote', async () => {
    const { create, call } = makeHandler();
    await call('handleQuotePublished', { quoteId: 'q1', requestId: 'r1' });

    const { data } = argsOf(create);
    expect(data.userId).toBe('cust-1');
    expect(data.data.quoteId).toBe('q1');
    expect(data.data.actionUrl).toBe('/requests/r1/quotes/q1');
  });

  it('quote.expiring_soon includes the expiry time it was given', async () => {
    const { create, call } = makeHandler();
    const validUntil = new Date(Date.now() + 3600_000).toISOString();
    await call('handleQuoteExpiringSoon', { quoteId: 'q1', requestId: 'r1', validUntil });
    expect(argsOf(create).data.data.validUntil).toBe(validUntil);
  });

  it('quote.expired notifies the customer', async () => {
    const { create, call } = makeHandler();
    await call('handleQuoteExpired', { quoteId: 'q1', requestId: 'r1' });
    expect(argsOf(create).data.data.notificationType).toBe('QUOTE_EXPIRED');
  });

  it('request.converted points the customer at the resulting order', async () => {
    const { create, call } = makeHandler();
    await call('handleRequestConverted', { requestId: 'r1', orderId: 'o1' });

    const { data } = argsOf(create);
    expect(data.data.orderId).toBe('o1');
    expect(data.data.actionUrl).toBe('/orders/o1');
  });
});


describe('SagaEventHandler — failure isolation', () => {
  it('does not throw when the request row is missing (must not kill the subscription)', async () => {
    const { create, call } = makeHandler({ request: null });
    await expect(
      call('handleQuotePublished', { quoteId: 'q1', requestId: 'missing' }),
    ).resolves.toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it('swallows a persistence failure so the event bus is not asked to redeliver', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const { handler } = makeHandler({ create });

    await expect(
      (handler as any).handleRequestSubmitted({ requestId: 'r1', customerId: 'cust-1' }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when the Prisma Notification model is absent entirely', async () => {
    // Reproduces the original defect: no `Notification` delegate at all. This
    // used to return silently, which is how four live handlers became no-ops.
    (globalThis as any).prisma = { Request_Request: { findUnique: jest.fn() } };
    const handler = new SagaEventHandler(
      {} as any, {} as any, {} as NotificationValidationService, jest.fn(), jest.fn(),
    );

    await expect(
      (handler as any).handleRequestSubmitted({ requestId: 'r1', customerId: 'cust-1' }),
    ).resolves.toBeUndefined();
  });
});


describe('SagaEventHandler — subscription wiring', () => {
  const REQUEST_EVENTS: Array<[string, string]> = [
    ['request.submitted', 'handleRequestSubmitted'],
    ['request.assessing', 'handleRequestAssessing'],
    ['request.needs_clarification', 'handleRequestNeedsClarification'],
    ['request.fulfillable', 'handleRequestFulfillable'],
    ['request.unfulfillable', 'handleRequestUnfulfillable'],
    ['request.cancelled', 'handleRequestCancelled'],
    ['quote.published', 'handleQuotePublished'],
    ['quote.expiring_soon', 'handleQuoteExpiringSoon'],
    ['quote.expired', 'handleQuoteExpired'],
    ['request.converted', 'handleRequestConverted'],
    ['supplier.invite_recommended', 'handleSupplierInviteRecommended'],
  ];

  it('subscribes to every request/quote event it claims to handle', () => {
    const { handler } = makeHandler();
    const subscribed: string[] = [];
    handler.setupSubscriptions({ subscribe: (name: string) => { subscribed.push(name); } } as any);

    for (const [evt] of REQUEST_EVENTS) {
      expect(subscribed).toContain(evt);
    }
  });

  it('backs every subscribed event with a handler method that actually exists', () => {
    const { handler } = makeHandler();
    for (const [, method] of REQUEST_EVENTS) {
      expect(typeof (handler as any)[method]).toBe('function');
    }
  });

  it('routes an event through the real subscription callback to a real write', async () => {
    const { handler, create } = makeHandler();
    let captured: any = null;
    handler.setupSubscriptions({
      subscribe: (name: string, fn: any) => { if (name === 'quote.published') captured = fn; },
    } as any);

    expect(captured).toBeInstanceOf(Function);
    await captured({ data: { quoteId: 'q1', requestId: 'r1' } });

    expect(argsOf(create).data.data.notificationType).toBe('QUOTE_PUBLISHED');
  });
});

