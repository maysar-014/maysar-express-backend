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

interface PesapalResponse<T = Record<string, unknown>> {
  status?: string;
  message?: string;
  data?: T;
}

export class PesapalAdapter {
  private readonly pesapalUrl = process.env.PESAPAL_URL || 'https://api.pesapal.com/v3';
  private readonly secretKey = process.env.PESAPAL_SECRET_KEY || process.env.PESAPAL_API_KEY || process.env.PESAPAL_CONSUMER_SECRET;

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.secretKey) {
      return {
        success: false,
        error: 'PESAPAL_SECRET_KEY is not configured',
        status: 'failed'
      };
    }

    try {
      const paymentData = {
        tx_ref: request.orderId,
        amount: request.amount,
        currency: request.currency,
        redirect_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/callback`,
        payment_options: 'mobilemoney,card,banktransfer',
        customer: {
          email: request.buyerEmail,
          phonenumber: request.buyerPhone,
          name: request.buyerId
        },
        customizations: {
          title: 'Maysar Order Payment',
          description: request.description
        }
      };

      const response = await fetch(`${this.pesapalUrl}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const result = (await response.json()) as PesapalResponse<{ id?: number | string; tx_ref?: string; link?: string; status?: string }>;

      if (!response.ok || result.status?.toLowerCase() !== 'success') {
        return {
          success: false,
          error: result.message || 'Payment processing failed',
          status: 'failed'
        };
      }

      const status = this.mapPesapalStatus(result.data?.status);
      return {
        success: true,
        transactionId: result.data?.tx_ref || request.orderId,
        paymentUrl: result.data?.link,
        status
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        status: 'failed'
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    if (!this.secretKey) {
      return {
        success: false,
        transactionId,
        error: 'PESAPAL_SECRET_KEY is not configured',
        status: 'failed'
      };
    }

    try {
      const response = await fetch(
        `${this.pesapalUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(transactionId)}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = (await response.json()) as PesapalResponse<{ status?: string }>;
      const status = this.mapPesapalStatus(result.data?.status);

      return {
        success: status === 'completed',
        transactionId,
        status,
        error: response.ok ? undefined : result.message || 'Unable to verify transaction'
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        status: 'failed'
      };
    }
  }

  async processPayout(_request: PayoutRequest): Promise<PayoutResponse> {
    return {
      success: false,
      error: 'Payouts are not implemented for Pesapal adapter in order-service',
      status: 'failed'
    };
  }

  private mapPesapalStatus(pesapalStatus?: string): 'pending' | 'completed' | 'failed' | 'cancelled' {
    switch (pesapalStatus?.toLowerCase()) {
      case 'successful':
      case 'completed':
      case 'paid':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'pending';
    }
  }
}
