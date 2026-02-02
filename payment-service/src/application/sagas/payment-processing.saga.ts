/**
 * Payment Processing Saga
 * Orchestrates payment processing workflow with compensation logic
 * Follows distributed saga pattern for cross-service transactions
 */

export interface PaymentSagaState {
    paymentId: string;
    orderId: string;
    userId: string;
    amount: number;
    currency: string;
    method: string;
    status: 'INITIATED' | 'FRAUD_CHECKED' | 'PAYMENT_PROCESSED' | 'ORDER_UPDATED' | 'COMPLETED' | 'FAILED';
    fraudAssessment?: {
        riskScore: number;
        riskLevel: string;
        recommendation: string;
    };
    providerReference?: string;
    error?: string;
    compensationSteps: string[];
}

export interface SagaStep {
    name: string;
    execute: (state: PaymentSagaState) => Promise<PaymentSagaState>;
    compensate: (state: PaymentSagaState) => Promise<void>;
}

export class PaymentProcessingSaga {
    private steps: SagaStep[] = [];

    constructor(
        private readonly paymentRepository: any,
        private readonly paymentProviderFactory: any,
        private readonly fraudEngine: any,
        private readonly paymentProcessingEngine: any,
        private readonly eventBus: any
    ) {
        this.initializeSteps();
    }

    private initializeSteps(): void {
        this.steps = [
            {
                name: 'InitiatePayment',
                execute: this.initiatePayment.bind(this),
                compensate: this.cancelPayment.bind(this),
            },
            {
                name: 'FraudCheck',
                execute: this.performFraudCheck.bind(this),
                compensate: this.revertFraudCheck.bind(this),
            },
            {
                name: 'ProcessPayment',
                execute: this.processPayment.bind(this),
                compensate: this.refundPayment.bind(this),
            },
            {
                name: 'UpdateOrder',
                execute: this.updateOrder.bind(this),
                compensate: this.revertOrderUpdate.bind(this),
            },
            {
                name: 'NotifyUser',
                execute: this.notifyUser.bind(this),
                compensate: this.sendFailureNotification.bind(this),
            },
        ];
    }

    /**
     * Execute saga
     */
    async execute(initialState: Omit<PaymentSagaState, 'status' | 'compensationSteps'>): Promise<PaymentSagaState> {
        let state: PaymentSagaState = {
            ...initialState,
            status: 'INITIATED',
            compensationSteps: [],
        };

        const executedSteps: string[] = [];

        try {
            // Execute each step
            for (const step of this.steps) {
                console.log(`Executing saga step: ${step.name}`);
                state = await step.execute(state);
                executedSteps.push(step.name);
                state.compensationSteps.push(step.name);

                // Publish step completed event
                await this.publishStepEvent(step.name, 'COMPLETED', state);
            }

            state.status = 'COMPLETED';
            await this.publishSagaEvent('PaymentSagaCompleted', state);

            return state;
        } catch (error) {
            console.error(`Saga failed at step: ${executedSteps[executedSteps.length - 1]}`, error);
            state.error = error instanceof Error ? error.message : 'Unknown error';
            state.status = 'FAILED';

            // Compensate in reverse order
            await this.compensate(state, executedSteps);

            await this.publishSagaEvent('PaymentSagaFailed', state);

            return state;
        }
    }

    /**
     * Compensate executed steps
     */
    private async compensate(state: PaymentSagaState, executedSteps: string[]): Promise<void> {
        const reversedSteps = [...executedSteps].reverse();

        for (const stepName of reversedSteps) {
            const step = this.steps.find((s) => s.name === stepName);
            if (step) {
                try {
                    console.log(`Compensating saga step: ${step.name}`);
                    await step.compensate(state);
                    await this.publishStepEvent(step.name, 'COMPENSATED', state);
                } catch (compensationError) {
                    console.error(`Compensation failed for step: ${step.name}`, compensationError);
                    // Continue with other compensations even if one fails
                }
            }
        }
    }

    /**
     * Step 1: Initiate Payment
     */
    private async initiatePayment(state: PaymentSagaState): Promise<PaymentSagaState> {
        // Payment already created by use case
        // Just update status
        await this.eventBus.publish({
            eventType: 'PaymentInitiated',
            aggregateId: state.paymentId,
            aggregateType: 'Payment',
            payload: {
                paymentId: state.paymentId,
                orderId: state.orderId,
                userId: state.userId,
                amount: state.amount,
                currency: state.currency,
                method: state.method,
            },
            occurredAt: new Date(),
        });

        return state;
    }

    /**
     * Step 2: Fraud Check
     */
    private async performFraudCheck(state: PaymentSagaState): Promise<PaymentSagaState> {
        const fraudAssessment = await this.fraudEngine.assessTransaction({
            transactionId: state.paymentId,
            userId: state.userId,
            amount: state.amount,
            currency: state.currency,
            paymentMethod: state.method,
            ipAddress: '0.0.0.0', // Would come from request
            deviceFingerprint: 'unknown',
            billingAddress: {},
            shippingAddress: {},
            timestamp: new Date(),
        });

        if (fraudAssessment.recommendation === 'decline') {
            throw new Error('Payment declined due to fraud risk');
        }

        state.fraudAssessment = {
            riskScore: fraudAssessment.riskScore,
            riskLevel: fraudAssessment.riskLevel,
            recommendation: fraudAssessment.recommendation,
        };
        state.status = 'FRAUD_CHECKED';

        return state;
    }

    /**
     * Step 3: Process Payment
     */
    private async processPayment(state: PaymentSagaState): Promise<PaymentSagaState> {
        if (state.method === 'WALLET') {
            // Asynchronous delegation to Wallet Service
            await this.eventBus.publish({
                eventType: 'WalletPaymentRequested',
                aggregateId: state.paymentId,
                aggregateType: 'Payment',
                payload: {
                    paymentId: state.paymentId,
                    userId: state.userId,
                    amount: state.amount,
                    currency: state.currency,
                    orderId: state.orderId,
                },
                occurredAt: new Date(),
            });

            // Status is now waiting for Wallet Service
            state.status = 'PAYMENT_PROCESSED'; // Or WAITING_FOR_WALLET
            return state;
        }

        const providerType = this.paymentProcessingEngine.selectPaymentProvider(state.method as any);
        const provider = this.paymentProviderFactory.getProvider(providerType);
        const response = await provider.processPayment({
            paymentId: state.paymentId,
            amount: state.amount,
            currency: state.currency,
            method: state.method,
            customerInfo: {
                userId: state.userId,
            },
        });

        if (!response.success) {
            throw new Error(response.message || 'Payment processing failed');
        }

        state.providerReference = response.providerReference;
        state.status = 'PAYMENT_PROCESSED';

        await this.eventBus.publish({
            eventType: 'PaymentCompleted',
            aggregateId: state.paymentId,
            aggregateType: 'Payment',
            payload: {
                paymentId: state.paymentId,
                orderId: state.orderId,
                userId: state.userId,
                amount: state.amount,
                currency: state.currency,
                providerTransactionId: response.providerTransactionId,
                completedAt: new Date(),
            },
            occurredAt: new Date(),
        });

        return state;
    }

    /**
     * Step 4: Update Order
     */
    private async updateOrder(state: PaymentSagaState): Promise<PaymentSagaState> {
        await this.eventBus.publish({
            eventType: 'Payment.Success.v1',
            payload: {
                orderId: state.orderId,
                paymentId: state.paymentId,
                amount: state.amount,
                currency: state.currency,
                completedAt: new Date(),
            },
            occurredAt: new Date(),
        });

        state.status = 'ORDER_UPDATED';
        return state;
    }

    /**
     * Step 5: Notify User
     */
    private async notifyUser(state: PaymentSagaState): Promise<PaymentSagaState> {
        await this.eventBus.publish({
            eventType: 'PaymentNotificationRequested',
            payload: {
                userId: state.userId,
                paymentId: state.paymentId,
                orderId: state.orderId,
                amount: state.amount,
                currency: state.currency,
                notificationType: 'PAYMENT_SUCCESS',
            },
            occurredAt: new Date(),
        });

        return state;
    }

    /**
     * Compensation: Cancel Payment
     */
    private async cancelPayment(state: PaymentSagaState): Promise<void> {
        await this.eventBus.publish({
            eventType: 'PaymentCancelled',
            aggregateId: state.paymentId,
            aggregateType: 'Payment',
            payload: {
                paymentId: state.paymentId,
                orderId: state.orderId,
                userId: state.userId,
                reason: state.error || 'Saga compensation',
                cancelledAt: new Date(),
            },
            occurredAt: new Date(),
        });
    }

    /**
     * Compensation: Revert Fraud Check
     */
    private async revertFraudCheck(state: PaymentSagaState): Promise<void> {
        // No compensation needed for fraud check
        console.log('Fraud check compensation - no action needed');
    }

    /**
     * Compensation: Refund Payment
     */
    private async refundPayment(state: PaymentSagaState): Promise<void> {
        await this.eventBus.publish({
            eventType: 'PaymentRefund.Command.v1',
            payload: {
                paymentId: state.paymentId,
                amount: state.amount,
                reason: 'SAGA_COMPENSATION',
                reasonDetails: state.error,
            },
            occurredAt: new Date(),
        });
    }

    /**
     * Compensation: Revert Order Update
     */
    private async revertOrderUpdate(state: PaymentSagaState): Promise<void> {
        await this.eventBus.publish({
            eventType: 'Payment.Failure.v1',
            payload: {
                orderId: state.orderId,
                paymentId: state.paymentId,
                reason: state.error || 'Payment failed',
                failedAt: new Date(),
            },
            occurredAt: new Date(),
        });
    }

    /**
     * Compensation: Send Failure Notification
     */
    private async sendFailureNotification(state: PaymentSagaState): Promise<void> {
        await this.eventBus.publish({
            eventType: 'PaymentNotificationRequested',
            payload: {
                userId: state.userId,
                paymentId: state.paymentId,
                orderId: state.orderId,
                amount: state.amount,
                currency: state.currency,
                notificationType: 'PAYMENT_FAILED',
                failureReason: state.error,
            },
            occurredAt: new Date(),
        });
    }

    /**
     * Publish step event
     */
    private async publishStepEvent(
        stepName: string,
        status: string,
        state: PaymentSagaState
    ): Promise<void> {
        await this.eventBus.publish({
            eventType: `PaymentSagaStep${status}`,
            payload: {
                sagaId: state.paymentId,
                stepName,
                status,
                state,
            },
            occurredAt: new Date(),
        });
    }

    /**
     * Publish saga event
     */
    private async publishSagaEvent(eventType: string, state: PaymentSagaState): Promise<void> {
        await this.eventBus.publish({
            eventType,
            payload: {
                sagaId: state.paymentId,
                state,
            },
            occurredAt: new Date(),
        });
    }
}
