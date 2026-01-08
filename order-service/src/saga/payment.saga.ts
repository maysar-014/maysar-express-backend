import { Payment, PaymentStatus, PaymentMethod } from '../domain/entities/payment.entity';
import { PesapalAdapter } from '../infrastructure/integrations/pesapal.adapter';

export enum PaymentStep {
  INITIATED = 'initiated',
  FRAUD_CHECK = 'fraud_check',
  PROCESSING = 'processing',
  CONFIRMATION = 'confirmation',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface PaymentState {
  paymentId: string;
  orderId: string;
  currentStep: PaymentStep;
  fraudCheckStatus?: 'approved' | 'rejected' | 'pending';
  processingStatus?: 'success' | 'failed' | 'pending';
  failureReason?: string;
  retryCount: number;
}

export class PaymentSaga {
  constructor(private pesapalAdapter: PesapalAdapter) {}

  async startPayment(payment: Payment): Promise<PaymentState> {
    const state: PaymentState = {
      paymentId: payment.id,
      orderId: payment.orderId,
      currentStep: PaymentStep.INITIATED,
      retryCount: 0
    };

    // Skip fraud check for COD
    if (payment.method === PaymentMethod.COD) {
      state.currentStep = PaymentStep.COMPLETED;
      payment.updateStatus(PaymentStatus.COMPLETED);
      return state;
    }

    // Start fraud check
    return await this.processFraudCheck(state, payment);
  }

  private async processFraudCheck(state: PaymentState, payment: Payment): Promise<PaymentState> {
    state.currentStep = PaymentStep.FRAUD_CHECK;

    try {
      const fraudResult = await this.performFraudCheck(payment);
      state.fraudCheckStatus = fraudResult.approved ? 'approved' : 'rejected';

      if (!fraudResult.approved) {
        state.currentStep = PaymentStep.FAILED;
        state.failureReason = fraudResult.reason;
        payment.updateStatus(PaymentStatus.FAILED);
        return state;
      }

      // Proceed to payment processing
      return await this.processPayment(state, payment);
    } catch (error) {
      state.currentStep = PaymentStep.FAILED;
      state.failureReason = error.message;
      payment.updateStatus(PaymentStatus.FAILED);
      return state;
    }
  }

  private async processPayment(state: PaymentState, payment: Payment): Promise<PaymentState> {
    state.currentStep = PaymentStep.PROCESSING;
    payment.updateStatus(PaymentStatus.PROCESSING);

    try {
      let processingResult;

      switch (payment.method) {
        case PaymentMethod.CARD:
        case PaymentMethod.MOBILE_MONEY:
          processingResult = await this.processPesapalPayment(payment);
          break;
        case PaymentMethod.WALLET:
          processingResult = await this.processWalletPayment(payment);
          break;
        default:
          throw new Error(`Unsupported payment method: ${payment.method}`);
      }

      state.processingStatus = processingResult.success ? 'success' : 'failed';

      if (processingResult.success) {
        payment.updateStatus(PaymentStatus.COMPLETED, processingResult.transactionId);
        state.currentStep = PaymentStep.COMPLETED;
      } else {
        if (state.retryCount < 3) {
          state.retryCount++;
          // Schedule retry
          return await this.scheduleRetry(state, payment);
        } else {
          payment.updateStatus(PaymentStatus.FAILED);
          state.currentStep = PaymentStep.FAILED;
          state.failureReason = processingResult.error;
        }
      }

      return state;
    } catch (error) {
      payment.updateStatus(PaymentStatus.FAILED);
      state.currentStep = PaymentStep.FAILED;
      state.failureReason = error.message;
      return state;
    }
  }

  private async performFraudCheck(payment: Payment): Promise<{ approved: boolean; reason?: string }> {
    // Implement fraud detection logic
    
    // Check amount limits
    if (payment.amount > 1000000) { // 1M TZS
      return { approved: false, reason: 'Amount exceeds fraud threshold' };
    }

    // Check buyer history (placeholder)
    const buyerRisk = await this.assessBuyerRisk(payment.buyerId);
    if (buyerRisk.level === 'high') {
      return { approved: false, reason: 'High-risk buyer' };
    }

    // Check velocity (multiple payments in short time)
    const recentPayments = await this.getRecentPayments(payment.buyerId);
    if (recentPayments.length > 5) {
      return { approved: false, reason: 'Too many recent payments' };
    }

    return { approved: true };
  }

  private async processPesapalPayment(payment: Payment): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const paymentRequest = {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      buyerId: payment.buyerId,
      buyerEmail: 'customer@example.com', // Should come from buyer data
      buyerPhone: '+255700000000', // Should come from buyer data
      description: `Payment for order ${payment.orderId}`
    };

    return await this.pesapalAdapter.processPayment(paymentRequest);
  }

  private async processWalletPayment(payment: Payment): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Implement wallet payment logic
    try {
      // Check wallet balance
      const walletBalance = await this.getWalletBalance(payment.buyerId);
      if (walletBalance < payment.amount) {
        return { success: false, error: 'Insufficient wallet balance' };
      }

      // Deduct from wallet
      await this.deductFromWallet(payment.buyerId, payment.amount);
      
      return { 
        success: true, 
        transactionId: `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async scheduleRetry(state: PaymentState, payment: Payment): Promise<PaymentState> {
    // Implement retry logic with exponential backoff
    const delayMs = Math.pow(2, state.retryCount) * 1000; // 1s, 2s, 4s, 8s
    
    setTimeout(async () => {
      await this.processPayment(state, payment);
    }, delayMs);

    return state;
  }

  private async assessBuyerRisk(buyerId: string): Promise<{ level: 'low' | 'medium' | 'high' }> {
    // Placeholder for buyer risk assessment
    return { level: 'low' };
  }

  private async getRecentPayments(buyerId: string): Promise<Payment[]> {
    // Placeholder for recent payments check
    return [];
  }

  private async getWalletBalance(buyerId: string): Promise<number> {
    // Integration with wallet service
    return 100000; // Placeholder
  }

  private async deductFromWallet(buyerId: string, amount: number): Promise<void> {
    // Integration with wallet service
  }
}