import { Payment, PaymentMethod, PaymentStatus } from '../../domain/entities/payment.entity';
import { SelcomPesaAdapter } from '../../infrastructure/providers/selcom-pesa.adapter';
import { PaymentSaga } from './payment.saga';

jest.mock('../../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: {
    save: jest.fn(),
    update: jest.fn(),
    getById: jest.fn(),
    saveStep: jest.fn(),
    updateStep: jest.fn(),
    getStepsBySagaId: jest.fn()
  }
}));

class TestablePaymentSaga extends PaymentSaga {
  public publishCommand = jest.fn();
}

const makePayment = (method: PaymentMethod, amount = 1000) =>
  new Payment({
    id: `pay-${method.toLowerCase()}`,
    orderId: 'order-1',
    buyerId: 'buyer-1',
    amount,
    currency: 'TZS',
    method
  });

describe('PaymentSaga', () => {
  const paymentGatewayAdapter = {
    processPayment: jest.fn()
  } as unknown as SelcomPesaAdapter;

  const saga = new TestablePaymentSaga(paymentGatewayAdapter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines two core steps', () => {
    expect(saga.steps.map(step => step.name)).toEqual(['FraudCheck', 'ProcessPayment']);
  });

  it('skips fraud check for COD and does not call fraud engine', async () => {
    const fraudSpy = jest.spyOn(saga as any, 'performFraudCheck');
    const step = saga.steps.find(s => s.name === 'FraudCheck');
    const payment = makePayment(PaymentMethod.COD);

    await step?.execute({ payment }, 'saga-cod');

    expect(fraudSpy).not.toHaveBeenCalled();
    expect(payment.status).toBe(PaymentStatus.PENDING);
  });

  it('fails fraud check when amount exceeds threshold', async () => {
    const step = saga.steps.find(s => s.name === 'FraudCheck');
    const payment = makePayment(PaymentMethod.CARD, 2_000_000);

    await expect(step?.execute({ payment }, 'saga-fraud')).rejects.toThrow('Fraud check failed');
    expect(payment.status).toBe(PaymentStatus.FAILED);
  });

  it('completes COD payment immediately in ProcessPayment', async () => {
    const step = saga.steps.find(s => s.name === 'ProcessPayment');
    const payment = makePayment(PaymentMethod.COD);

    await step?.execute({ payment }, 'saga-process-cod');

    expect(payment.status).toBe(PaymentStatus.COMPLETED);
  });

  it('processes card/mobile money via PaymentGateway and sets transaction id', async () => {
    const step = saga.steps.find(s => s.name === 'ProcessPayment');
    const payment = makePayment(PaymentMethod.CARD, 5000);
    jest
      .spyOn(saga as any, 'processPaymentGatewayPayment')
      .mockResolvedValue({ success: true, transactionId: 'tx-paymentGateway-1' });

    await step?.execute({ payment }, 'saga-process-card');

    expect(payment.status).toBe(PaymentStatus.COMPLETED);
    expect(payment.transactionId).toBe('tx-paymentGateway-1');
  });

  it('fails process step when payment provider returns error', async () => {
    const step = saga.steps.find(s => s.name === 'ProcessPayment');
    const payment = makePayment(PaymentMethod.MOBILE_MONEY, 3000);
    jest
      .spyOn(saga as any, 'processPaymentGatewayPayment')
      .mockResolvedValue({ success: false, error: 'gateway timeout' });

    await expect(step?.execute({ payment }, 'saga-process-fail')).rejects.toThrow(
      'Payment processing failed: gateway timeout'
    );
    expect(payment.status).toBe(PaymentStatus.FAILED);
  });

  it('processes wallet payments via wallet branch and compensates completed payments', async () => {
    const step = saga.steps.find(s => s.name === 'ProcessPayment');
    const payment = makePayment(PaymentMethod.WALLET, 1200);
    jest
      .spyOn(saga as any, 'processWalletPayment')
      .mockResolvedValue({ success: true, transactionId: 'tx-wallet-1' });

    await step?.execute({ payment }, 'saga-wallet');
    expect(payment.status).toBe(PaymentStatus.COMPLETED);

    await step?.compensate({ payment }, 'saga-wallet');
    expect((saga as any).publishCommand).toHaveBeenCalledWith(
      'PaymentRefund.Command',
      expect.objectContaining({
        paymentId: payment.id,
        orderId: 'order-1',
        amount: 1200
      }),
      'saga-wallet'
    );
  });
});
