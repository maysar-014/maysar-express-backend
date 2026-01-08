export interface SettlementRequest {
  orderId: string;
  buyerId: string;
  sellerId: string;
  courierId?: string;
  totalAmount: number;
  paymentMethod: 'COD' | 'WALLET' | 'CARD';
  commissionRate: number;
}

export interface SettlementResult {
  settlementId: string;
  sellerPayout: number;
  platformCommission: number;
  courierEarnings: number;
  status: 'pending' | 'completed' | 'failed';
}

export class SettlementService {
  async processSettlement(request: SettlementRequest): Promise<SettlementResult> {
    const commission = this.calculateCommission(request.totalAmount, request.commissionRate);
    const courierEarnings = this.calculateCourierEarnings(request.totalAmount);
    const sellerPayout = request.totalAmount - commission - courierEarnings;

    const settlement: SettlementResult = {
      settlementId: this.generateSettlementId(),
      sellerPayout,
      platformCommission: commission,
      courierEarnings,
      status: 'pending'
    };

    if (request.paymentMethod === 'COD') {
      return await this.processCODSettlement(settlement, request);
    } else {
      return await this.processDigitalSettlement(settlement, request);
    }
  }

  private calculateCommission(amount: number, rate: number): number {
    return Math.round(amount * rate * 100) / 100;
  }

  private calculateCourierEarnings(amount: number): number {
    // Base delivery fee + percentage
    const baseDeliveryFee = 500; // 500 TZS
    const percentageFee = amount * 0.02; // 2%
    return Math.min(baseDeliveryFee + percentageFee, amount * 0.1); // Max 10%
  }

  private async processCODSettlement(settlement: SettlementResult, request: SettlementRequest): Promise<SettlementResult> {
    // COD requires courier to collect and remit payment
    settlement.status = 'pending';
    return settlement;
  }

  private async processDigitalSettlement(settlement: SettlementResult, request: SettlementRequest): Promise<SettlementResult> {
    // Digital payments can be settled immediately
    settlement.status = 'completed';
    return settlement;
  }

  private generateSettlementId(): string {
    return `settlement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}