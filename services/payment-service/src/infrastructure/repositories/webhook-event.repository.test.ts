import { WebhookEventRepository } from './webhook-event.repository';

describe('WebhookEventRepository', () => {
  it('strips undefined values from JSON payloads before writing to Prisma', async () => {
    const upsert = jest.fn().mockResolvedValue({ id: 'pay_webhook_1' });
    const prisma = {
      payment_WebhookEvent: {
        upsert
      }
    } as any;
    const repository = new WebhookEventRepository(prisma);

    await repository.recordReceived({
      provider: 'paymentGateway',
      eventType: 'payment.status.update',
      eventId: 'evt_1',
      payload: {
        status: 'COMPLETED',
        metadata: {
          notificationType: undefined,
          merchantReference: 'pay_123',
          rawBody: {
            OrderNotificationType: null,
            status: 'COMPLETED'
          }
        }
      }
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        payload: {
          status: 'COMPLETED',
          metadata: {
            merchantReference: 'pay_123',
            rawBody: {
              OrderNotificationType: null,
              status: 'COMPLETED'
            }
          }
        }
      }),
      update: expect.objectContaining({
        payload: {
          status: 'COMPLETED',
          metadata: {
            merchantReference: 'pay_123',
            rawBody: {
              OrderNotificationType: null,
              status: 'COMPLETED'
            }
          }
        }
      })
    }));
  });
});
