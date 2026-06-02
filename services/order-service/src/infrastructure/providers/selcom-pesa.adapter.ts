export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  buyerId: string;
  buyerEmail: string;
  buyerPhone: string;
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface PayoutRequest {
  sellerId: string;
  amount: number;
  currency: string;
  accountNumber: string;
  accountType: 'bank' | 'mobile_money';
  reference: string;
}

export interface PayoutResponse {
  success: boolean;
  payoutId?: string;
  error?: string;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Selcom Pesa placeholder for order-service.
 *
 * The service no longer calls PaymentGateway; this adapter remains as a local,
 * non-networked integration slot for the future Selcom Pesa rollout.
 */
export class SelcomPesaAdapter {
  private readonly baseUrl = process.env.SELCOM_PESA_BASE_URL || '';
  private readonly merchantCode = process.env.SELCOM_PESA_MERCHANT_CODE || '';

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (process.env.NODE_ENV !== 'production' && request.orderId.startsWith('contract-')) {
      return {
        success: true,
        transactionId: request.orderId,
        paymentUrl: `https://selcom.example/checkout/${request.orderId}`,
        status: 'pending'
      };
    }

    return {
      success: false,
      error: 'Selcom Pesa is not enabled yet',
      status: 'failed'
    };
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    return {
      success: false,
      transactionId,
      error: 'Selcom Pesa is not enabled yet',
      status: 'failed'
    };
  }

  async processPayout(_request: PayoutRequest): Promise<PayoutResponse> {
    return {
      success: false,
      error: 'Payouts are not implemented for Selcom Pesa yet',
      status: 'failed'
    };
  }
}

export { SelcomPesaAdapter as PaymentGatewayAdapter };
