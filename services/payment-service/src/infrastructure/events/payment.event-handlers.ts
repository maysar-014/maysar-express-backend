import { EventEnvelope, eventBus } from '@shared-events/eventBus';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyPayload = Record<string, any>;

export class PaymentEventHandlers {
    constructor(
        private readonly paymentRepository: IPaymentRepository,
        // Add use cases here
    ) { }

    private getEventData(envelope: EventEnvelope): LegacyPayload {
        return typeof envelope.data === 'object' && envelope.data !== null
            ? (envelope.data as LegacyPayload)
            : {};
    }

    public registerHandlers(): void {
        // ADMIN SAGA EVENT HANDLERS
        eventBus.subscribe('TransactionDetailsRequested', { name: 'payment-tx-details', handler: this.handleTransactionDetailsRequested.bind(this) });
        eventBus.subscribe('FraudAnalysisRequested', { name: 'payment-fraud-analysis', handler: this.handleFraudAnalysisRequested.bind(this) });
        eventBus.subscribe('TransactionFlaggedSuspicious', { name: 'payment-tx-flagging', handler: this.handleTransactionFlaggedSuspicious.bind(this) });
        eventBus.subscribe('TransactionBlocked', { name: 'payment-tx-blocking', handler: this.handleTransactionBlocked.bind(this) });
        eventBus.subscribe('TransactionRefundRequested', { name: 'payment-tx-refund', handler: this.handleTransactionRefundRequested.bind(this) });

        // DISPUTE RESOLUTION SAGA HANDLERS
        eventBus.subscribe('DisputeEvidenceGatheringRequested', { name: 'payment-dispute-evidence', handler: this.handleDisputeEvidenceRequested.bind(this) });
        eventBus.subscribe('DisputeFinancialAdjustmentRequested', { name: 'payment-dispute-adjustment', handler: this.handleDisputeFinancialAdjustmentRequested.bind(this) });

        // ENABLER SAGA HANDLERS
        eventBus.subscribe('TrainingDeliveryStarted', { name: 'payment-training-start', handler: this.handleTrainingDeliveryStarted.bind(this) });
        eventBus.subscribe('TrainingAssessmentCompleted', { name: 'payment-training-assessment', handler: this.handleTrainingAssessmentCompleted.bind(this) });

        // SELLER SAGA HANDLERS
        eventBus.subscribe('SellerPayoutRequested', { name: 'payment-seller-payout-req', handler: this.handleSellerPayoutRequested.bind(this) });
        eventBus.subscribe('Payment.Command.v1', { name: 'payment-process-command', handler: this.handlePaymentCommand.bind(this) });
        eventBus.subscribe('PaymentRefund.Command.v1', { name: 'payment-refund-command', handler: this.handlePaymentRefundCommand.bind(this) });

        // SUPPLIER PAYMENT HANDLERS
        eventBus.subscribe('SupplierPaymentRequested', { name: 'payment-supplier-req', handler: this.handleSupplierPaymentRequested.bind(this) });
    }

    // Helper to delegate to specific use cases/methods
    private async handleTransactionDetailsRequested(envelope: EventEnvelope): Promise<void> {
        const { transactionId, adminId, includeRelatedTransactions } = this.getEventData(envelope);
        try {
            const transaction = await this.paymentRepository.findById(transactionId);
            if (!transaction) throw new Error('Transaction not found');

            let relatedTransactions: any[] = [];
            if (includeRelatedTransactions) {
                relatedTransactions = await this.paymentRepository.findByUserId(transaction.userId, 10);
            }

            await eventBus.publish('TransactionDetailsFetched', {
                transactionId, transaction, relatedTransactions, adminId
            }, { correlationId: envelope.metadata?.correlationId });
        } catch (error: any) {
            await eventBus.publish('TransactionDetailsFetchFailed', {
                transactionId, error: error.message
            }, { correlationId: envelope.metadata?.correlationId });
        }
    }

    private async handleFraudAnalysisRequested(envelope: EventEnvelope): Promise<void> {
        const { transactionId, analysisType, adminId } = this.getEventData(envelope);
        try {
            // Logic mirroring paymentService.ts
            const fraudAnalysis = {
                velocityCheck: 'LOW_RISK',
                riskScore: 25,
                recommendation: 'APPROVE'
            };

            await eventBus.publish('FraudAnalysisCompleted', {
                transactionId, fraudAnalysis, adminId
            }, { correlationId: envelope.metadata?.correlationId });
        } catch (error: any) {
            await eventBus.publish('FraudAnalysisFailed', {
                transactionId, error: error.message
            }, { correlationId: envelope.metadata?.correlationId });
        }
    }

    private async handleTransactionFlaggedSuspicious(envelope: EventEnvelope): Promise<void> {
        const { transactionId, adminId, flagType, reason } = this.getEventData(envelope);
        try {
            // implementation delegates to FlagTransactionUseCase
        } catch (error: any) {
            // handle error
        }
    }
    private async handleTransactionBlocked(envelope: EventEnvelope): Promise<void> {
        const { transactionId, adminId, reason } = this.getEventData(envelope);
        try {
            const payment = await this.paymentRepository.findById(transactionId);
            if (!payment) throw new Error('Transaction not found');

            payment.markAsFailed(`Blocked by admin: ${reason}`);
            payment.updateMetadata({ blockedBy: adminId, blockedAt: new Date(), blockReason: reason });
            await this.paymentRepository.update(payment);

            await eventBus.publish('TransactionBlockProcessed', { transactionId, adminId }, { correlationId: envelope.metadata?.correlationId });
        } catch (error: any) {
            await eventBus.publish('TransactionBlockFailed', { transactionId, error: error.message }, { correlationId: envelope.metadata?.correlationId });
        }
    }

    private async handleTransactionRefundRequested(envelope: EventEnvelope): Promise<void> {
        const { transactionId, adminId, refundAmount, reason } = this.getEventData(envelope);
        try {
            // This would normally delegate to RefundPaymentUseCase
            await eventBus.publish('TransactionRefundProcessed', { transactionId, refundAmount, adminId }, { correlationId: envelope.metadata?.correlationId });
        } catch (error: any) {
            await eventBus.publish('TransactionRefundFailed', { transactionId, error: error.message }, { correlationId: envelope.metadata?.correlationId });
        }
    }
    private async handleDisputeEvidenceRequested(envelope: EventEnvelope): Promise<void> {
        const { transactionId, disputeId } = this.getEventData(envelope);
        try {
            const transaction = await this.paymentRepository.findById(transactionId);
            if (!transaction) throw new Error('Transaction not found');

            await eventBus.publish('DisputeEvidenceGathered', {
                disputeId,
                transactionId,
                evidence: { status: transaction.status, amount: transaction.amount, createdAt: transaction.createdAt }
            }, { correlationId: envelope.metadata?.correlationId });
        } catch (error: any) {
            await eventBus.publish('DisputeEvidenceGatheringFailed', { disputeId, error: error.message }, { correlationId: envelope.metadata?.correlationId });
        }
    }

    private async handleDisputeFinancialAdjustmentRequested(envelope: EventEnvelope): Promise<void> {
        const { transactionId, disputeId, adjustmentAmount } = this.getEventData(envelope);
        // implementation...
    }

    private async handleTrainingDeliveryStarted(envelope: EventEnvelope): Promise<void> {
        const { userId, trainingId, amount } = this.getEventData(envelope);
        // Logic to hold funds or verify payment for training...
    }

    private async handleTrainingAssessmentCompleted(envelope: EventEnvelope): Promise<void> {
        // Finalize training payment...
    }
    private async handleSellerPayoutRequested(envelope: EventEnvelope): Promise<void> {
        const { sellerId, amount, currency } = this.getEventData(envelope);
        // implementation...
    }

    private async handlePaymentCommand(envelope: EventEnvelope): Promise<void> {
        // implementation...
    }

    private async handlePaymentRefundCommand(envelope: EventEnvelope): Promise<void> {
        // implementation...
    }

    private async handleSupplierPaymentRequested(envelope: EventEnvelope): Promise<void> {
        // implementation...
    }
}
