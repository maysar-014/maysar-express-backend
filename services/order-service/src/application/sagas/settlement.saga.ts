import { SettlementService, SettlementRequest } from '../../domain/engines/settlement.engine';

export enum SettlementStep {
  INITIATED = 'initiated',
  COMPLIANCE_CHECK = 'compliance_check',
  PAYMENT_PROCESSING = 'payment_processing',
  COMMISSION_DISTRIBUTION = 'commission_distribution',
  PAYOUT_PROCESSING = 'payout_processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface SettlementState {
  settlementId: string;
  orderId: string;
  currentStep: SettlementStep;
  complianceStatus?: 'approved' | 'rejected' | 'pending';
  paymentStatus?: 'success' | 'failed' | 'pending';
  payoutStatus?: 'success' | 'failed' | 'pending';
  failureReason?: string;
}

export class SettlementSaga {
  constructor(private settlementService: SettlementService) {}

  async startSettlement(request: SettlementRequest): Promise<SettlementState> {
    const settlementResult = await this.settlementService.processSettlement(request);
    
    const state: SettlementState = {
      settlementId: settlementResult.settlementId,
      orderId: request.orderId,
      currentStep: SettlementStep.INITIATED
    };

    // Start compliance check
    return await this.processComplianceCheck(state, request);
  }

  private async processComplianceCheck(state: SettlementState, request: SettlementRequest): Promise<SettlementState> {
    state.currentStep = SettlementStep.COMPLIANCE_CHECK;

    try {
      // BoT compliance for large amounts
      if (request.totalAmount > 100000) { // 100,000 TZS
        const complianceResult = await this.checkBOTCompliance(request);
        state.complianceStatus = complianceResult.approved ? 'approved' : 'rejected';
        
        if (!complianceResult.approved) {
          state.currentStep = SettlementStep.FAILED;
          state.failureReason = complianceResult.reason;
          return state;
        }
      } else {
        state.complianceStatus = 'approved';
      }

      // Proceed to payment processing
      return await this.processPayment(state, request);
    } catch (error) {
      state.currentStep = SettlementStep.FAILED;
      state.failureReason = (error as Error).message;
      return state;
    }
  }

  private async processPayment(state: SettlementState, request: SettlementRequest): Promise<SettlementState> {
    state.currentStep = SettlementStep.PAYMENT_PROCESSING;

    try {
      if (request.paymentMethod === 'COD') {
        // COD payments are handled by courier
        state.paymentStatus = 'pending';
      } else {
        // Process digital payment
        const paymentResult = await this.processDigitalPayment(request);
        state.paymentStatus = paymentResult.success ? 'success' : 'failed';
        
        if (!paymentResult.success) {
          state.currentStep = SettlementStep.FAILED;
          state.failureReason = paymentResult.error;
          return state;
        }
      }

      // Proceed to commission distribution
      return await this.distributeCommissions(state, request);
    } catch (error) {
      state.currentStep = SettlementStep.FAILED;
      state.failureReason = (error as Error).message;
      return state;
    }
  }

  private async distributeCommissions(state: SettlementState, request: SettlementRequest): Promise<SettlementState> {
    state.currentStep = SettlementStep.COMMISSION_DISTRIBUTION;

    try {
      // Calculate and record commissions
      await this.recordPlatformCommission(request);
      await this.recordCourierEarnings(request);
      
      // Proceed to payout
      return await this.processPayout(state, request);
    } catch (error) {
      state.currentStep = SettlementStep.FAILED;
      state.failureReason = (error as Error).message;
      return state;
    }
  }

  private async processPayout(state: SettlementState, request: SettlementRequest): Promise<SettlementState> {
    state.currentStep = SettlementStep.PAYOUT_PROCESSING;

    try {
      // Process seller payout
      const payoutResult = await this.processSellerPayout(request);
      state.payoutStatus = payoutResult.success ? 'success' : 'failed';
      
      if (payoutResult.success) {
        state.currentStep = SettlementStep.COMPLETED;
      } else {
        state.currentStep = SettlementStep.FAILED;
        state.failureReason = payoutResult.error;
      }

      return state;
    } catch (error) {
      state.currentStep = SettlementStep.FAILED;
      state.failureReason = (error as Error).message;
      return state;
    }
  }

  private async checkBOTCompliance(request: SettlementRequest): Promise<{ approved: boolean; reason?: string }> {
    // Integration with Bank of Tanzania compliance checks
    return { approved: true };
  }

  private async processDigitalPayment(request: SettlementRequest): Promise<{ success: boolean; error?: string }> {
    // Integration with Pesapal or other PSP
    return { success: true };
  }

  private async recordPlatformCommission(request: SettlementRequest): Promise<void> {
    // Record platform commission in ledger
  }

  private async recordCourierEarnings(request: SettlementRequest): Promise<void> {
    // Record courier earnings in ledger
  }

  private async processSellerPayout(request: SettlementRequest): Promise<{ success: boolean; error?: string }> {
    // Process payout to seller wallet or bank account
    return { success: true };
  }
}
