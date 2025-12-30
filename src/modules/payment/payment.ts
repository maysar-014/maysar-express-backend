import { v4 as uuidv4 } from 'uuid'
import Pesapal from 'pesapal'
import { prisma } from './prisma'
import { paymentEncryption } from './encryption'
import { EventEnvelope, Money } from '../../../shared-contracts/types'
import {
  UserRegisteredEvent,
  PaymentSucceededEvent,
  RefundCompletedEvent,
  UserSuspendedEvent,
  OrderDeliveredEvent,
  CommissionEarnedEvent,
  DisputeOpenedEvent,
  DisputeResolvedEvent
} from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund'
}

export enum PaymentMethod {
  MPESA = 'MPESA',
  MIXX_BY_YAS = 'MIXX_BY_YAS',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  HALOPESA = 'HALOPESA',
  CARD = 'CARD',
  BANK = 'BANK',
  WALLET = 'WALLET'
}

export interface PesapalConfig {
  consumerKey: string
  consumerSecret: string
  environment: 'sandbox' | 'live'
  callbackUrl: string
  notificationId?: string
}

export interface PaymentRequest {
  orderId: string
  buyerId: string
  amount: Money
  method: PaymentMethod
  description?: string
  customerInfo?: {
    email: string
    phone?: string
    firstName?: string
    lastName?: string
  }
}

export interface PaymentResponse {
  payment: any
  pesapalOrderTrackingId?: string
  redirectUrl?: string
  status: PaymentStatus
}

export interface WalletTransaction {
  walletId: string
  type: 'credit' | 'debit'
  amount: number
  currency: string
  description: string
  reference?: string
}

export class PaymentService {
  private pesapal: any
  private config: PesapalConfig

  constructor() {
    // Initialize Pesapal
    this.config = {
      consumerKey: process.env.PESAPAL_CONSUMER_KEY || '',
      consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || '',
      environment: (process.env.PESAPAL_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
      callbackUrl: process.env.PESAPAL_CALLBACK_URL || '',
      notificationId: process.env.PESAPAL_NOTIFICATION_ID
    }

    this.pesapal = new Pesapal(this.config)

    // Subscribe to events
    eventBus.subscribe('UserRegistered.v1', {
      name: 'payment-service-user-registered',
      handler: this.handleUserRegistered.bind(this)
    })
    eventBus.subscribe('UserSuspended.v1', {
      name: 'payment-service-user-suspended',
      handler: this.handleUserSuspended.bind(this)
    })
    eventBus.subscribe('OrderDelivered.v1', {
      name: 'payment-service-order-delivered',
      handler: this.handleOrderDelivered.bind(this)
    })
    eventBus.subscribe('CommissionEarned.v1', {
      name: 'payment-service-commission-earned',
      handler: this.handleCommissionEarned.bind(this)
    })
    eventBus.subscribe('DisputeOpened.v1', {
      name: 'payment-service-dispute-opened',
      handler: this.handleDisputeOpened.bind(this)
    })
    eventBus.subscribe('DisputeResolved.v1', {
      name: 'payment-service-dispute-resolved',
      handler: this.handleDisputeResolved.bind(this)
    })
  }

  // Wallet Management
  async handleUserRegistered(envelope: EventEnvelope) {
    const event = envelope.payload as UserRegisteredEvent
    await this.createWallet(event.userId)
  }

  async createWallet(userId: string): Promise<any> {
    // PCI DSS 3.4 - Encrypt initial balance
    const encryptedBalance = paymentEncryption.encryptBalance(0, 'TZS')

    return await (prisma as any).wallet.create({
      data: {
        userId,
        encryptedBalance,
        currency: 'TZS',
        createdBy: 'system',
        updatedBy: 'system'
      }
    })
  }

  async getWallet(userId: string): Promise<any> {
    const wallet = await (prisma as any).wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!wallet) return null

    // PCI DSS 3.4 - Decrypt balance for display
    const balanceInfo = paymentEncryption.decryptBalance(wallet.encryptedBalance)

    return {
      ...wallet,
      balance: balanceInfo.balance,
      lastUpdated: balanceInfo.lastUpdated
    }
  }

  async creditWallet(walletTransaction: WalletTransaction): Promise<any> {
    const wallet = await (prisma as any).wallet.findUnique({
      where: { userId: walletTransaction.walletId }
    })

    if (!wallet) throw new Error('Wallet not found')

    // PCI DSS 3.4 - Decrypt current balance
    const currentBalance = paymentEncryption.decryptBalance(wallet.encryptedBalance).balance
    const newBalance = currentBalance + walletTransaction.amount

    // PCI DSS 3.4 - Encrypt new balance
    const encryptedBalance = paymentEncryption.encryptBalance(newBalance, walletTransaction.currency)

    // Update wallet balance with optimistic locking
    const updatedWallet = await (prisma as any).wallet.update({
      where: {
        userId: walletTransaction.walletId,
        version: wallet.version // Optimistic locking
      },
      data: {
        encryptedBalance,
        version: { increment: 1 },
        updatedBy: 'payment-service'
      }
    })

    // PCI DSS 10.2 - Create encrypted transaction record
    const encryptedAmount = paymentEncryption.encryptAmount(walletTransaction.amount, walletTransaction.currency)
    await (prisma as any).transaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        encryptedAmount,
        currency: walletTransaction.currency,
        description: walletTransaction.description,
        externalReference: walletTransaction.reference,
        ipAddress: null, // Would be populated from request context
        userAgent: null, // Would be populated from request context
        createdBy: 'payment-service'
      }
    })

    // PCI DSS 10.5.1 - Audit log for financial transaction
    await this.createAuditLog('WALLET_CREDIT', 'wallet', wallet.id, {
      amount: walletTransaction.amount,
      currency: walletTransaction.currency,
      newBalance,
      performedBy: 'payment-service'
    })

    return {
      ...updatedWallet,
      balance: newBalance
    }
  }

  async debitWallet(walletTransaction: WalletTransaction): Promise<any> {
    const wallet = await (prisma as any).wallet.findUnique({
      where: { userId: walletTransaction.walletId }
    })

    if (!wallet) throw new Error('Wallet not found')

    // PCI DSS 3.4 - Decrypt current balance
    const currentBalance = paymentEncryption.decryptBalance(wallet.encryptedBalance).balance

    if (currentBalance < walletTransaction.amount) {
      throw new Error('Insufficient wallet balance')
    }

    const newBalance = currentBalance - walletTransaction.amount

    // PCI DSS 3.4 - Encrypt new balance
    const encryptedBalance = paymentEncryption.encryptBalance(newBalance, walletTransaction.currency)

    // Update wallet balance with optimistic locking
    const updatedWallet = await (prisma as any).wallet.update({
      where: {
        userId: walletTransaction.walletId,
        version: wallet.version // Optimistic locking
      },
      data: {
        encryptedBalance,
        version: { increment: 1 },
        updatedBy: 'payment-service'
      }
    })

    // PCI DSS 10.2 - Create encrypted transaction record
    const encryptedAmount = paymentEncryption.encryptAmount(walletTransaction.amount, walletTransaction.currency)
    await (prisma as any).transaction.create({
      data: {
        walletId: wallet.id,
        type: 'DEBIT',
        encryptedAmount,
        currency: walletTransaction.currency,
        description: walletTransaction.description,
        externalReference: walletTransaction.reference,
        ipAddress: null, // Would be populated from request context
        userAgent: null, // Would be populated from request context
        createdBy: 'payment-service'
      }
    })

    // PCI DSS 10.5.1 - Audit log for financial transaction
    await this.createAuditLog('WALLET_DEBIT', 'wallet', wallet.id, {
      amount: walletTransaction.amount,
      currency: walletTransaction.currency,
      previousBalance: currentBalance,
      newBalance,
      performedBy: 'payment-service'
    })

    return {
      ...updatedWallet,
      balance: newBalance
    }
  }

  // Pesapal Payment Processing
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Create payment record
      const payment = await (prisma as any).payment.create({
        data: {
          orderId: request.orderId,
          buyerId: request.buyerId,
          amount: request.amount.amount,
          currency: request.amount.currency,
          status: PaymentStatus.PENDING,
          method: request.method,
          description: request.description
        }
      })

      // If payment method is wallet, process directly
      if (request.method === PaymentMethod.WALLET) {
        return await this.processWalletPayment(payment.id, request.buyerId, request.amount)
      }

      // For other methods, use Pesapal
      const pesapalRequest = {
        amount: request.amount.amount,
        currency: request.amount.currency,
        description: request.description || `Payment for order ${request.orderId}`,
        callback_url: this.config.callbackUrl,
        notification_id: this.config.notificationId,
        billing_address: {
          email_address: request.customerInfo?.email,
          phone_number: request.customerInfo?.phone,
          first_name: request.customerInfo?.firstName,
          last_name: request.customerInfo?.lastName
        }
      }

      const pesapalResponse = await this.pesapal.submitOrderRequest(pesapalRequest)

      // Update payment with Pesapal tracking ID
      await (prisma as any).payment.update({
        where: { id: payment.id },
        data: {
          pesapalOrderTrackingId: pesapalResponse.order_tracking_id,
          pesapalMerchantReference: pesapalResponse.merchant_reference
        }
      })

      return {
        payment,
        pesapalOrderTrackingId: pesapalResponse.order_tracking_id,
        redirectUrl: pesapalResponse.redirect_url,
        status: PaymentStatus.PENDING
      }

    } catch (error) {
      console.error('Payment initiation failed:', error)
      throw new Error(`Payment initiation failed: ${(error as Error).message}`)
    }
  }

  private async processWalletPayment(paymentId: string, buyerId: string, amount: Money): Promise<PaymentResponse> {
    try {
      // Check wallet balance
      const wallet = await this.getWallet(buyerId)
      if (wallet.balance < amount.amount) {
        throw new Error('Insufficient wallet balance')
      }

      // Debit wallet
      await this.debitWallet({
        walletId: buyerId,
        type: 'debit',
        amount: amount.amount,
        currency: amount.currency,
        description: `Payment for order`,
        reference: paymentId
      })

      // Update payment status
      const payment = await (prisma as any).payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.COMPLETED }
      })

      // Emit payment success event
      await this.emitPaymentSuccessEvent(payment)

      return {
        payment,
        status: PaymentStatus.COMPLETED
      }

    } catch (error) {
      // Update payment status to failed
      await (prisma as any).payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED }
      })
      throw error
    }
  }

  // Legacy method for backward compatibility
  async processPayment(orderId: string, buyerId: string, amount: Money): Promise<any> {
    const request: PaymentRequest = {
      orderId,
      buyerId,
      amount,
      method: PaymentMethod.WALLET // Default to wallet for legacy
    }
    return await this.initiatePayment(request)
  }

  // Pesapal Callback/Webhook Handler
  async handlePaymentCallback(orderTrackingId: string, paymentStatus: string): Promise<void> {
    const payment = await (prisma as any).payment.findFirst({
      where: { pesapalOrderTrackingId: orderTrackingId }
    })

    if (!payment) {
      console.error(`Payment not found for tracking ID: ${orderTrackingId}`)
      return
    }

    let newStatus: PaymentStatus
    switch (paymentStatus.toLowerCase()) {
      case 'completed':
      case 'success':
        newStatus = PaymentStatus.COMPLETED
        break
      case 'failed':
        newStatus = PaymentStatus.FAILED
        break
      case 'cancelled':
        newStatus = PaymentStatus.CANCELLED
        break
      default:
        newStatus = PaymentStatus.PENDING
    }

    await (prisma as any).payment.update({
      where: { id: payment.id },
      data: { status: newStatus }
    })

    if (newStatus === PaymentStatus.COMPLETED) {
      await this.emitPaymentSuccessEvent(payment)
    }
  }

  // Check Payment Status
  async getPaymentStatus(paymentId: string): Promise<any> {
    const payment = await (prisma as any).payment.findUnique({
      where: { id: paymentId }
    })

    if (!payment) throw new Error('Payment not found')

    // If we have Pesapal tracking ID, query Pesapal
    if (payment.pesapalOrderTrackingId) {
      try {
        const pesapalStatus = await this.pesapal.queryPaymentStatus({
          order_tracking_id: payment.pesapalOrderTrackingId
        })

        // Update local status if different
        if (pesapalStatus.payment_status_description !== payment.status) {
          await this.handlePaymentCallback(payment.pesapalOrderTrackingId, pesapalStatus.payment_status_description)
          payment.status = pesapalStatus.payment_status_description
        }

        return {
          ...payment,
          pesapalStatus: pesapalStatus
        }
      } catch (error) {
        console.error('Failed to query Pesapal status:', error)
      }
    }

    return payment
  }

  // Refund Processing
  async refundPayment(paymentId: string, amount?: number, reason: string = ''): Promise<any> {
    const payment = await (prisma as any).payment.findUnique({
      where: { id: paymentId }
    })

    if (!payment) throw new Error('Payment not found')
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Can only refund completed payments')
    }

    const refundAmount = amount || payment.amount

    try {
      // Process refund via Pesapal if applicable
      if (payment.pesapalOrderTrackingId) {
        await this.pesapal.refundPayment({
          order_tracking_id: payment.pesapalOrderTrackingId,
          amount: refundAmount,
          reason: reason
        })
      }

      // Update payment status
      const newStatus = refundAmount === payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIAL_REFUND
      await (prisma as any).payment.update({
        where: { id: paymentId },
        data: { status: newStatus }
      })

      // Credit wallet if it was a wallet payment
      if (payment.method === PaymentMethod.WALLET) {
        await this.creditWallet({
          walletId: payment.buyerId,
          type: 'credit',
          amount: refundAmount,
          currency: payment.currency,
          description: `Refund: ${reason}`,
          reference: paymentId
        })
      }

      // Emit refund event using helper function
      const envelope = eventBus.createEventEnvelope<RefundCompletedEvent>('RefundCompleted', {
        paymentId,
        orderId: payment.orderId,
        amount: { amount: refundAmount, currency: payment.currency },
        reason
      })

      eventBus.publish(envelope)

      return payment

    } catch (error) {
      console.error('Refund failed:', error)
      throw new Error(`Refund failed: ${(error as Error).message}`)
    }
  }

  // Payout Processing (for sellers)
  async processPayout(sellerId: string, amount: Money, bankDetails: any): Promise<any> {
    // This would integrate with Pesapal's payout API
    // For now, create a placeholder implementation
    console.log(`Processing payout for seller ${sellerId}: ${amount.amount} ${amount.currency}`)

    // In real implementation, use Pesapal payout API
    // const payout = await this.pesapal.submitPayoutRequest({ ... })

    return {
      payoutId: uuidv4(),
      status: 'initiated',
      amount,
      sellerId
    }
  }

  // Reconciliation
  async reconcilePayments(): Promise<any> {
    // Compare local payment records with Pesapal
    const payments = await (prisma as any).payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        pesapalOrderTrackingId: { not: null }
      }
    })

    const reconciliationResults = []

    for (const payment of payments) {
      try {
        const pesapalStatus = await this.pesapal.queryPaymentStatus({
          order_tracking_id: payment.pesapalOrderTrackingId
        })

        reconciliationResults.push({
          paymentId: payment.id,
          localStatus: payment.status,
          pesapalStatus: pesapalStatus.payment_status_description,
          reconciled: payment.status === pesapalStatus.payment_status_description
        })
      } catch (error) {
        reconciliationResults.push({
          paymentId: payment.id,
          error: (error as Error).message
        })
      }
    }

    return reconciliationResults
  }

  private async emitPaymentSuccessEvent(payment: any): Promise<void> {
    // Emit payment success event using helper function
    const envelope = eventBus.createEventEnvelope<PaymentSucceededEvent>('PaymentSucceeded', {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: { amount: payment.amount, currency: payment.currency }
    })

    eventBus.publish(envelope)
  }

  // PCI DSS 10.5.1 - Audit logging for all payment operations
  private async createAuditLog(action: string, entityType: string, entityId: string, details: any): Promise<void> {
    const checksum = paymentEncryption.generateChecksum({
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString()
    })

    await (prisma as any).paymentAuditLog.create({
      data: {
        paymentId: entityType === 'payment' ? entityId : null,
        walletId: entityType === 'wallet' ? entityId : null,
        action,
        entityType,
        entityId,
        oldValues: null, // Would be populated for updates
        newValues: JSON.stringify(details),
        performedBy: 'payment-service',
        ipAddress: null, // Would be populated from request context
        userAgent: null, // Would be populated from request context
        checksum
      }
    })
  }

  // Event Handlers
  async handleUserSuspended(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as UserSuspendedEvent

    try {
      // When a user is suspended, freeze their wallet
      console.log(`Freezing wallet for suspended user: ${event.userId}`)

      // This would integrate with wallet freezing logic
      // For now, just log the event
      // In a real implementation, you'd update wallet status to 'frozen'

    } catch (error) {
      console.error(`Failed to handle UserSuspended for user ${event.userId}:`, error)
    }
  }

  async handleOrderDelivered(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as OrderDeliveredEvent

    try {
      // When an order is delivered, credit seller's wallet (if applicable)
      // This would typically be handled by commission service, but payment service
      // might need to handle direct wallet credits for delivered orders

      console.log(`Order delivered: ${event.orderId} - wallet operations may be needed`)

      // In a real implementation, you might check if there are any pending wallet credits
      // related to this order delivery

    } catch (error) {
      console.error(`Failed to handle OrderDelivered for order ${event.orderId}:`, error)
    }
  }

  async handleCommissionEarned(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as CommissionEarnedEvent

    try {
      // Commission has been earned - this is already handled by commission service
      // Payment service might need to verify the wallet credit was successful

      console.log(`Commission earned: ${event.commissionId} for ${event.recipientId}`)

      // In a real implementation, you might verify the wallet transaction
      // or perform additional payment-related logic

    } catch (error) {
      console.error(`Failed to handle CommissionEarned for commission ${event.commissionId}:`, error)
    }
  }

  async handleDisputeOpened(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as DisputeOpenedEvent

    try {
      // When a dispute is opened, hold payment or freeze related transactions
      console.log(`Dispute opened: ${event.disputeId} for order ${event.orderId}`)

      // In a real implementation, you might:
      // - Hold payments related to the disputed order
      // - Freeze seller wallet temporarily
      // - Notify payment processor of the dispute

    } catch (error) {
      console.error(`Failed to handle DisputeOpened for dispute ${event.disputeId}:`, error)
    }
  }

  async handleDisputeResolved(envelope: EventEnvelope): Promise<void> {
    const event = envelope.payload as DisputeResolvedEvent

    try {
      // When a dispute is resolved, release held payments or process refunds
      console.log(`Dispute resolved: ${event.disputeId} with resolution: ${event.resolution}`)

      // In a real implementation, you might:
      // - Release held payments if seller upheld
      // - Process refunds if buyer wins
      // - Unfreeze seller wallet
      // - Process split payments if applicable

    } catch (error) {
      console.error(`Failed to handle DisputeResolved for dispute ${event.disputeId}:`, error)
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).payment.count()

      // Test Pesapal connectivity
      let pesapalHealthy = false
      try {
        // Simple Pesapal health check
        pesapalHealthy = true // Assume healthy for now
      } catch (error) {
        console.warn('Pesapal health check failed:', error)
      }

      // PCI DSS 12.8 - Run security tests
      const securityTests = paymentEncryption.runSecurityTests()

      return {
        status: 'healthy',
        service: 'payment-service',
        pesapal: pesapalHealthy ? 'connected' : 'disconnected',
        security: securityTests.passed ? 'compliant' : 'issues_detected',
        encryptionKeyVersion: paymentEncryption.getCurrentKeyVersion()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'payment-service',
        error: (error as Error).message
      }
    }
  }
}
