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

  it('returns 401 when signature is missing or invalid', async () => {
    const controller = new WebhookController(
      {
        verifyWebhookSignature: jest.fn().mockReturnValue(false),
        handleWebhook: jest.fn()
      } as never,
      { execute: jest.fn() } as never
    );
    const req: any = {
      body: { tx_ref: 'track-1', status: 'successful' },
      query: {},
      headers: {}
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    expect(loggerWarnMock).toHaveBeenCalledWith('Invalid webhook signature', { signature: undefined });
  });

  it('returns 400 when required payload parameters are missing', async () => {
    const controller = new WebhookController(
      {
        verifyWebhookSignature: jest.fn().mockReturnValue(true),
        handleWebhook: jest.fn()
      } as never,
      { execute: jest.fn() } as never
    );
    const req: any = {
      body: { status: 'successful' },
      query: {},
      headers: { 'verif-hash': 'sig' }
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required parameters' });
  });

  it('processes valid webhook and returns 200', async () => {
    const pesapalAdapter = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      handleWebhook: jest.fn().mockResolvedValue(undefined)
    };
    const handleWebhookUseCase = {
      execute: jest.fn().mockResolvedValue({ handled: true })
    };
    const controller = new WebhookController(pesapalAdapter as never, handleWebhookUseCase as never);
    const req: any = {
      body: {
        tx_ref: 'track-1',
        status: 'successful',
        id: 777
      },
      query: {},
      headers: { 'verif-hash': 'sig' }
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(pesapalAdapter.verifyWebhookSignature).toHaveBeenCalledWith(
      JSON.stringify(req.body),
      'sig'
    );
    expect(pesapalAdapter.handleWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        providerReference: 'track-1',
        status: 'successful'
      })
    );
    expect(handleWebhookUseCase.execute).toHaveBeenCalledWith(
      'track-1',
      '777',
      'successful',
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'OK' });
    expect(loggerInfoMock).toHaveBeenCalledWith('Webhook processed successfully', { handled: true });
  });

  it('returns 500 when processing throws', async () => {
    const controller = new WebhookController(
      {
        verifyWebhookSignature: jest.fn().mockImplementation(() => {
          throw new Error('verify-failure');
        }),
        handleWebhook: jest.fn()
      } as never,
      { execute: jest.fn() } as never
    );
    const req: any = {
      body: { tx_ref: 'track-1' },
      query: {},
      headers: { 'verif-hash': 'sig' }
    };
    const res = makeRes();

    await controller.handlePesapalWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    expect(loggerErrorMock).toHaveBeenCalledWith('Webhook processing failed', expect.any(Object));
  });
});
