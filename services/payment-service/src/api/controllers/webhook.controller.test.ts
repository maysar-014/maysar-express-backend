const loggerInfoMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: (...args: any[]) => loggerInfoMock(...args),
    warn: (...args: any[]) => loggerWarnMock(...args),
    error: (...args: any[]) => loggerErrorMock(...args),
    debug: jest.fn()
  }
}));

import { WebhookController } from './webhook.controller';

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('WebhookController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when required payload parameters are missing', async () => {
    const controller = new WebhookController(
      {
        handleWebhook: jest.fn()
      } as never,
      { execute: jest.fn() } as never
    );
    const req: any = {
      body: { status: 'successful' },
      query: {},
      headers: {}
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required parameters' });
  });

  it('processes valid webhook and returns 200', async () => {
    const pesapalAdapter = {
      handleWebhook: jest.fn().mockResolvedValue(undefined)
    };
    const handleWebhookUseCase = {
      execute: jest.fn().mockResolvedValue({ handled: true })
    };
    const controller = new WebhookController(pesapalAdapter as never, handleWebhookUseCase as never);
    const req: any = {
      body: {
        OrderTrackingId: 'track-1',
        OrderMerchantReference: 'merchant-1',
        OrderNotificationType: 'CHANGE',
        status: 'COMPLETED',
        id: 777
      },
      query: {},
      headers: {}
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(pesapalAdapter.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providerReference: 'track-1',
        status: 'COMPLETED'
      })
    );
    expect(handleWebhookUseCase.execute).toHaveBeenCalledWith(
      'track-1',
      '777',
      'COMPLETED',
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'OK' });
    expect(loggerInfoMock).toHaveBeenCalledWith('Webhook processed successfully', { handled: true });
  });

  it('falls back to provider reference when provider transaction ID is missing', async () => {
    const pesapalAdapter = {
      handleWebhook: jest.fn().mockResolvedValue(undefined)
    };
    const handleWebhookUseCase = {
      execute: jest.fn().mockResolvedValue({ handled: true })
    };
    const controller = new WebhookController(pesapalAdapter as never, handleWebhookUseCase as never);
    const req: any = {
      body: {
        OrderTrackingId: 'track-fallback',
        status: 'COMPLETED'
      },
      query: {},
      headers: {}
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(handleWebhookUseCase.execute).toHaveBeenCalledWith(
      'track-fallback',
      'track-fallback',
      'COMPLETED',
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 when processing throws', async () => {
    const controller = new WebhookController(
      {
        handleWebhook: jest.fn().mockRejectedValue(new Error('handle-failure'))
      } as never,
      { execute: jest.fn() } as never
    );
    const req: any = {
      body: { OrderTrackingId: 'track-1' },
      query: {},
      headers: {}
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(loggerErrorMock).toHaveBeenCalledWith('Webhook processing failed', expect.any(Object));
  });
});
