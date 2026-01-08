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

export class PesapalAdapter {
  private readonly pesapalUrl = process.env.PESAPAL_URL || 'https://cybqa.pesapal.com/pesapalv3';
  private readonly consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  private readonly consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const paymentData = {
        id: request.orderId,
        currency: request.currency,
        amount: request.amount,
        description: request.description,
        callback_url: `${process.env.BASE_URL}/api/payments/callback`,
        notification_id: await this.getNotificationId(token),
        billing_address: {
          email_address: request.buyerEmail,
          phone_number: request.buyerPhone,
          country_code: 'TZ',
          first_name: 'Customer',
          last_name: 'Name'
        }
      };

      const response = await fetch(`${this.pesapalUrl}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.status === '200') {
        return {
          success: true,
          transactionId: result.order_tracking_id,
          paymentUrl: result.redirect_url,
          status: 'pending'
        };
      } else {
        return {
          success: false,
          error: result.message || 'Payment processing failed',
          status: 'failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(`${this.pesapalUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      return {
        success: result.payment_status_description === 'Completed',
        transactionId,
        status: this.mapPesapalStatus(result.payment_status_description)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  async processPayout(request: PayoutRequest): Promise<PayoutResponse> {
    try {
      // Pesapal payout implementation
      const token = await this.getAccessToken();
      
      const payoutData = {
        amount: request.amount,
        currency: request.currency,
        account_number: request.accountNumber,
        account_type: request.accountType,
        reference: request.reference,
        description: `Payout for seller ${request.sellerId}`
      };

      const response = await fetch(`${this.pesapalUrl}/api/Payouts/ProcessPayout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payoutData)
      });

      const result = await response.json();

      return {
        success: result.status === 'success',
        payoutId: result.payout_id,
        status: result.status === 'success' ? 'completed' : 'failed',
        error: result.status !== 'success' ? result.message : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.pesapalUrl}/api/Auth/RequestToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret
      })
    });

    const result = await response.json();
    return result.token;
  }

  private async getNotificationId(token: string): Promise<string> {
    const response = await fetch(`${this.pesapalUrl}/api/URLSetup/RegisterIPN`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `${process.env.BASE_URL}/api/payments/ipn`,
        ipn_notification_type: 'GET'
      })
    });

    const result = await response.json();
    return result.ipn_id;
  }

  private mapPesapalStatus(pesapalStatus: string): 'pending' | 'completed' | 'failed' | 'cancelled' {
    switch (pesapalStatus?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
}