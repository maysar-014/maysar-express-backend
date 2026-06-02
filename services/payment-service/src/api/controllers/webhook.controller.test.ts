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

  it('returns 410 while payment webhook handling is disabled', async () => {
    const controller = new WebhookController({ handleWebhook: jest.fn(), getProviderName: jest.fn().mockReturnValue('selcom-pesa') } as never);
    const req: any = { body: {}, query: {}, headers: {} };
    const res = makeRes();

    await controller.handlePaymentWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('disabled'),
        provider: 'selcom-pesa'
      })
    );
  });
});
