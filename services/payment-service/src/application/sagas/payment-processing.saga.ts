import { DistributedSagaOrchestrator, SagaStep } from '@shared/saga/saga.orchestrator';
import { ISagaLogRepository, SagaLogEntry } from '@shared/saga/saga.log';

export interface PaymentSagaPayload {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    method: string;
}

export interface PaymentSagaContext extends PaymentSagaPayload {
    correlationId: string;
    status: string;
    fraudAssessment?: any;
    providerReference?: string;
    error?: string;
}

export class PaymentProcessingSaga extends DistributedSagaOrchestrator<PaymentSagaPayload> {
    protected sagaType = 'PaymentProcessingSaga';

    constructor(
        protected readonly sagaLogRepository: ISagaLogRepository,
        protected readonly serviceName: string,
        private readonly paymentRepository: any,
        private readonly paymentProviderFactory: any,
        private readonly fraudEngine: any,
        private readonly paymentProcessingEngine: any,
        protected readonly outbox?: any
    ) {
        super(sagaLogRepository, serviceName, outbox);
    }

    protected async onStart(sagaId: string, payload: PaymentSagaPayload, correlationId?: string): Promise<void> {
        const context: PaymentSagaContext = {
            ...payload,
            correlationId: correlationId || sagaId,
            status: 'INITIATED'
        };
        await this.sagaLogRepository.update(sagaId, { context });
    }

    protected defineSteps(): SagaStep<PaymentSagaPayload>[] {
        return [
            {
                name: 'InitiatePayment',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;
                    await this.publishCommand('PaymentInitiated', {
                        paymentId: context.paymentId,
                        orderId: context.orderId,
                        userId: context.userId,
                        amount: context.amount,
                        method: context.method
                    }, context.correlationId, sagaId);
                },
                compensate: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;
                    await this.publishCommand('PaymentCancelled', {
                        paymentId: context.paymentId,
                        reason: 'Saga Compensation'
                    }, context.correlationId, sagaId);
                }
            },
            {
                name: 'FraudCheck',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;
                    const assessment = await this.fraudEngine.assessTransaction({
                        transactionId: context.paymentId,
                        amount: context.amount
                    });
                    if (assessment.recommendation === 'decline') {
                        throw new Error('Fraud check failed');
                    }
                    context.fraudAssessment = assessment;
                    await this.sagaLogRepository.update(sagaId, { context });
                },
                compensate: async () => { }
            },
            {
                name: 'ProcessPayment',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;

                    if (context.method === 'WALLET') {
                        await this.publishCommand('WalletPaymentRequested', {
                            paymentId: context.paymentId,
                            userId: context.userId,
                            amount: context.amount
                        }, context.correlationId, sagaId);
                        return; // Async wait
                    }

                    const providerType = this.paymentProcessingEngine.selectPaymentProvider(context.method);
                    const provider = this.paymentProviderFactory.getProvider(providerType);
                    const response = await provider.processPayment({
                        paymentId: context.paymentId,
                        amount: context.amount
                    });
                    if (!response.success) throw new Error(response.message);

                    context.providerReference = response.providerReference;
                    await this.sagaLogRepository.update(sagaId, { context });
                },
                compensate: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;
                    await this.publishCommand('PaymentRefund.Command.v1', {
                        paymentId: context.paymentId,
                        amount: context.amount
                    }, context.correlationId, sagaId);
                }
            },
            {
                name: 'UpdateOrder',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;
                    await this.publishCommand('Payment.Success.v1', {
                        orderId: context.orderId,
                        paymentId: context.paymentId,
                        amount: context.amount
                    }, context.correlationId, sagaId);
                },
                compensate: async () => { }
            },
            {
                name: 'NotifyUser',
                execute: async (payload, sagaId) => {
                    const saga = await this.getSagaOrThrow(sagaId);
                    const context = saga.context as PaymentSagaContext;
                    await this.publishCommand('PaymentNotificationRequested', {
                        userId: context.userId,
                        paymentId: context.paymentId,
                        notificationType: 'PAYMENT_SUCCESS'
                    }, context.correlationId, sagaId);
                },
                compensate: async () => { }
            }
        ];
    }

    async handleWalletPaymentProcessed(sagaId: string): Promise<void> {
        await this.completeStep(sagaId, 'ProcessPayment');
    }

    async handleWalletPaymentFailed(sagaId: string, error: string): Promise<void> {
        await this.failStep(sagaId, 'ProcessPayment', error);
    }
}

