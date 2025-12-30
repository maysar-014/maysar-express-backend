declare module 'pesapal' {
  interface PesapalConfig {
    consumerKey: string
    consumerSecret: string
    environment: 'sandbox' | 'live'
    callbackUrl?: string
    notificationId?: string
  }

  interface OrderRequest {
    amount: number
    currency: string
    description: string
    callback_url?: string
    notification_id?: string
    billing_address?: {
      email_address?: string
      phone_number?: string
      first_name?: string
      last_name?: string
    }
  }

  interface OrderResponse {
    order_tracking_id: string
    merchant_reference: string
    redirect_url: string
  }

  interface PaymentStatusResponse {
    payment_status_description: string
    payment_method: string
    payment_account: string
  }

  interface RefundRequest {
    order_tracking_id: string
    amount: number
    reason: string
  }

  class Pesapal {
    constructor(config: PesapalConfig)

    submitOrderRequest(request: OrderRequest): Promise<OrderResponse>

    queryPaymentStatus(params: { order_tracking_id: string }): Promise<PaymentStatusResponse>

    refundPayment(request: RefundRequest): Promise<any>

    // Add other methods as needed
  }

  export = Pesapal
}
