import 'dotenv/config'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthService } from './modules/auth/auth'
import { OrderService } from './modules/order/order'
import { PaymentService } from './modules/payment/payment'
import { AdminService } from './modules/admin/admin'
import { InventoryService, createInventoryService } from './modules/inventory/inventory'
import { LogisticsService } from './modules/logistics/logistics'
import { CommissionService } from './modules/commission/commission'
import { CatalogService } from './modules/catalog/catalog'
import { SellerService } from './modules/seller/seller'
import { TrustService } from './modules/trust/trust'
import { NotificationService } from './modules/notification/notification'
import { CommunityService } from './modules/community/community'
import { AnalyticsService } from './modules/analytics/analytics'
import { AuthMiddleware } from './gateway/authMiddleware'
import apiRoutes from '../api/routes/index'

const app = express()

// Initialize Prisma client
const prisma = new PrismaClient()

// Initialize services
const authService = new AuthService()
const paymentService = new PaymentService()
const inventoryService = createInventoryService(prisma)
const logisticsService = new LogisticsService(inventoryService)
const commissionService = new CommissionService(paymentService)
const catalogService = new CatalogService()
const sellerService = new SellerService()
const trustService = new TrustService()
const notificationService = new NotificationService()
const communityService = new CommunityService()
const analyticsService = new AnalyticsService()
const orderService = new OrderService(paymentService)
const adminService = new AdminService(orderService, paymentService, authService)

// API Gateway Middleware Setup
const authMiddleware = new AuthMiddleware(authService, adminService)

// Initialize middleware
authMiddleware.init()

// Global Middleware (in order of execution)
app.use(authMiddleware.healthCheck)        // Health checks bypass everything
app.use(authMiddleware.requestLogger)      // Request logging
app.use(authMiddleware.securityHeaders)    // Security headers first
app.use(authMiddleware.corsHandler)        // CORS handling
app.use(authMiddleware.apiVersion)         // API versioning

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting (applied after essential middleware)
const generalRateLimit = authMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes
})

const authRateLimit = authMiddleware.rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10 // Stricter limit for auth endpoints
})

// Apply rate limiting to API routes
app.use('/v1', generalRateLimit)
app.use('/v2', generalRateLimit)
app.use('/auth', authRateLimit)
app.use('/admin', authRateLimit)

// Console API Routes
app.use('/api', apiRoutes)

// Enhanced Auth Routes
app.post('/auth/register', async (req, res) => {
  const request = req.body
  try {
    const result = await authService.register(request)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Registration failed' })
  }
})

app.post('/auth/login', async (req, res) => {
  const request = req.body
  try {
    const result = await authService.login(request)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Login failed' })
  }
})

app.post('/auth/logout', async (req, res) => {
  const { token } = req.body
  try {
    await authService.logout(token)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Logout failed' })
  }
})

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body
  try {
    const tokens = await authService.refreshToken(refreshToken)
    res.json(tokens)
  } catch (e) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Token refresh failed' })
  }
})

app.get('/auth/validate', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const payload = await authService.validateToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    res.json(payload)
  } catch (e) {
    res.status(401).json({ error: 'Token validation failed' })
  }
})

app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body
  try {
    await authService.initiatePasswordReset(email)
    res.json({ message: 'Password reset email sent' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Password reset failed' })
  }
})

app.post('/auth/reset-password', async (req, res) => {
  const request = req.body
  try {
    await authService.resetPassword(request)
    res.json({ message: 'Password reset successful' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Password reset failed' })
  }
})

app.post('/auth/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body
  try {
    await authService.changePassword(userId, currentPassword, newPassword)
    res.json({ message: 'Password changed successfully' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Password change failed' })
  }
})

app.post('/auth/verify-email', async (req, res) => {
  const { email, verificationCode } = req.body
  try {
    await authService.verifyEmail(email, verificationCode)
    res.json({ message: 'Email verified successfully' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Email verification failed' })
  }
})

app.post('/auth/resend-verification', async (req, res) => {
  const { email } = req.body
  try {
    await authService.resendEmailVerification(email)
    res.json({ message: 'Verification email sent' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Resend verification failed' })
  }
})

app.get('/auth/profile/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const profile = await authService.getUserProfile(userId)
    res.json({ profile })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Profile retrieval failed' })
  }
})

app.put('/auth/profile/:userId', async (req, res) => {
  const { userId } = req.params
  const profile = req.body
  try {
    const updatedProfile = await authService.updateUserProfile(userId, profile)
    res.json({ profile: updatedProfile })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Profile update failed' })
  }
})

app.get('/auth/sessions/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const sessions = await authService.getUserSessions(userId)
    res.json({ sessions })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Session retrieval failed' })
  }
})

app.delete('/auth/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params
  const { userId } = req.body
  try {
    await authService.revokeSession(sessionId, userId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Session revocation failed' })
  }
})

app.delete('/auth/sessions', async (req, res) => {
  const { userId } = req.body
  try {
    await authService.revokeAllSessions(userId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Session revocation failed' })
  }
})

// Admin Auth Routes
app.post('/auth/admin/suspend/:userId', async (req, res) => {
  const { userId } = req.params
  const { adminId, reason } = req.body
  try {
    await authService.suspendUser(userId, reason, adminId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'User suspension failed' })
  }
})

app.post('/auth/admin/reactivate/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    await authService.reactivateUser(userId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'User reactivation failed' })
  }
})

app.post('/auth/admin/deactivate/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    await authService.deactivateUser(userId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'User deactivation failed' })
  }
})

app.get('/auth/health', async (req, res) => {
  try {
    const health = await authService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

app.post('/order/create', async (req, res) => {
  const { buyerId, sellerId, items } = req.body
  try {
    const order = await orderService.createOrder(buyerId, sellerId, items)
    res.json({ order })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.post('/order/:id/pay', async (req, res) => {
  const { id } = req.params
  try {
    const payment = await orderService.payOrder(id)
    res.json({ payment })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

// Order management routes
app.get('/order/:id', async (req, res) => {
  const { id } = req.params
  const { includeItems } = req.query
  try {
    const order = await orderService.getOrderById(id, includeItems === 'true')
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.json({ order })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.get('/orders', async (req, res) => {
  const {
    buyerId,
    sellerId,
    status,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    page,
    limit
  } = req.query

  try {
    const filters: any = {}
    if (buyerId) filters.buyerId = buyerId
    if (sellerId) filters.sellerId = sellerId
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)
    if (minAmount) filters.minAmount = parseInt(minAmount as string)
    if (maxAmount) filters.maxAmount = parseInt(maxAmount as string)

    const result = await orderService.getOrders(
      filters,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    )
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.post('/order/:id/cancel', async (req, res) => {
  const { id } = req.params
  const { reason, cancelledBy } = req.body
  try {
    const result = await orderService.cancelOrder(id, reason, cancelledBy)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.post('/order/:id/ship', async (req, res) => {
  const { id } = req.params
  const { shippingInfo, shippedBy } = req.body
  try {
    const result = await orderService.shipOrder(id, shippingInfo, shippedBy)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.post('/order/:id/deliver', async (req, res) => {
  const { id } = req.params
  const { deliveredBy, deliveryNotes } = req.body
  try {
    const result = await orderService.deliverOrder(id, deliveredBy, deliveryNotes)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.get('/order/:id/history', async (req, res) => {
  const { id } = req.params
  try {
    const history = await orderService.getOrderHistory(id)
    res.json({ history })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.post('/order/validate', async (req, res) => {
  const { items } = req.body
  try {
    const validation = await orderService.validateOrderItems(items)
    res.json(validation)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.get('/order/stats', async (req, res) => {
  const { buyerId, sellerId, status, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (buyerId) filters.buyerId = buyerId
    if (sellerId) filters.sellerId = sellerId
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const stats = await orderService.getOrderStats(filters)
    res.json({ stats })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.post('/order/bulk-update', async (req, res) => {
  const { orderIds, newStatus, reason } = req.body
  try {
    const results = await orderService.bulkUpdateOrderStatus(orderIds, newStatus, reason)
    res.json({ results })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

app.get('/order/health', async (req, res) => {
  try {
    const health = await orderService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' })
  }
})

// Admin authentication routes
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const result = await adminService.authenticateAdmin(email, password)
    res.json(result)
  } catch (e) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Authentication failed' })
  }
})

// Admin action routes
app.post('/admin/request-action', async (req, res) => {
  const { adminId, action, entityType, entityId, reason, justification, riskAssessment, amount } = req.body
  try {
    const approvalId = await adminService.requestAction({
      adminId,
      action,
      entityType,
      entityId,
      reason,
      justification: justification || reason, // Fallback to reason if not provided
      riskAssessment: riskAssessment || 'medium', // Default risk assessment
      amount,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })
    if (approvalId) {
      res.json({ approvalId, status: 'pending_approval' })
    } else {
      res.json({ status: 'executed' })
    }
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Action request failed' })
  }
})

app.post('/admin/approve-action', async (req, res) => {
  const { approvalId, approverAdminId } = req.body
  try {
    await adminService.approveAction(approvalId, approverAdminId)
    res.json({ success: true, status: 'approved' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Approval failed' })
  }
})

// Admin data routes
app.get('/admin/dashboard', async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Dashboard error' })
  }
})

app.get('/admin/pending-approvals/:adminId', async (req, res) => {
  const { adminId } = req.params
  try {
    const approvals = await adminService.getPendingApprovals(adminId)
    res.json({ approvals })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get pending approvals' })
  }
})

app.get('/admin/audit-logs', async (req, res) => {
  const { adminId, action, entityType, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (adminId) filters.adminId = adminId
    if (action) filters.action = action
    if (entityType) filters.entityType = entityType
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const logs = await adminService.getAuditLogs(filters)
    res.json({ logs })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get audit logs' })
  }
})

// Payment endpoints
app.post('/payment/initiate', async (req, res) => {
  const { orderId, buyerId, amount, method, description, customerInfo } = req.body

  // Validate Tanzanian mobile money methods
  const validMethods = ['MPESA', 'MIXX_BY_YAS', 'AIRTEL_MONEY', 'HALOPESA', 'CARD', 'BANK', 'WALLET']
  if (!validMethods.includes(method)) {
    return res.status(400).json({
      error: 'Invalid payment method. Supported methods: MPESA, MIXX_BY_YAS, AIRTEL_MONEY, HALOPESA, CARD, BANK, WALLET'
    })
  }

  // Validate phone number for mobile money payments
  if (['MPESA', 'MIXX_BY_YAS', 'AIRTEL_MONEY', 'HALOPESA'].includes(method)) {
    if (!customerInfo?.phone) {
      return res.status(400).json({
        error: `${method} requires a phone number. Please provide customerInfo.phone`
      })
    }

    // Basic Tanzanian phone number validation
    const phoneRegex = /^(\+255|255|0)[67][0-9]{7}$/
    if (!phoneRegex.test(customerInfo.phone)) {
      return res.status(400).json({
        error: 'Invalid Tanzanian phone number format. Use +255XXXXXXXXX, 255XXXXXXXXX, or 0XXXXXXXXX'
      })
    }
  }

  try {
    const request = {
      orderId,
      buyerId,
      amount,
      method,
      description,
      customerInfo
    }
    const result = await paymentService.initiatePayment(request)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payment initiation failed' })
  }
})

app.get('/payment/:id/status', async (req, res) => {
  const { id } = req.params
  try {
    const status = await paymentService.getPaymentStatus(id)
    res.json({ payment: status })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get payment status' })
  }
})

app.post('/payment/callback', async (req, res) => {
  const { order_tracking_id, payment_status } = req.body
  try {
    await paymentService.handlePaymentCallback(order_tracking_id, payment_status)
    res.json({ success: true })
  } catch (e) {
    console.error('Payment callback error:', e)
    res.status(500).json({ error: 'Callback processing failed' })
  }
})

app.post('/payment/:id/refund', async (req, res) => {
  const { id } = req.params
  const { amount, reason } = req.body
  try {
    const refund = await paymentService.refundPayment(id, amount, reason)
    res.json({ refund })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Refund failed' })
  }
})

// Wallet endpoints
app.get('/wallet/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const wallet = await paymentService.getWallet(userId)
    res.json({ wallet })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get wallet' })
  }
})

app.post('/wallet/:userId/credit', async (req, res) => {
  const { userId } = req.params
  const { amount, currency, description, reference } = req.body
  try {
    const wallet = await paymentService.creditWallet({
      walletId: userId,
      type: 'credit',
      amount,
      currency: currency || 'TZS',
      description: description || 'Wallet credit',
      reference
    })
    res.json({ wallet })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Wallet credit failed' })
  }
})

app.post('/wallet/:userId/debit', async (req, res) => {
  const { userId } = req.params
  const { amount, currency, description, reference } = req.body
  try {
    const wallet = await paymentService.debitWallet({
      walletId: userId,
      type: 'debit',
      amount,
      currency: currency || 'TZS',
      description: description || 'Wallet debit',
      reference
    })
    res.json({ wallet })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Wallet debit failed' })
  }
})

// Reconciliation endpoint
app.post('/payment/reconcile', async (req, res) => {
  try {
    const results = await paymentService.reconcilePayments()
    res.json({ reconciliation: results })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Reconciliation failed' })
  }
})

// Payout endpoint
app.post('/payment/payout', async (req, res) => {
  const { sellerId, amount, bankDetails } = req.body
  try {
    const payout = await paymentService.processPayout(sellerId, amount, bankDetails)
    res.json({ payout })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Payout failed' })
  }
})

app.get('/payment/health', async (req, res) => {
  try {
    const health = await paymentService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Logistics endpoints
app.post('/logistics/carriers', async (req, res) => {
  const { name, code, apiKey, apiSecret, webhookUrl } = req.body
  try {
    const carrier = await logisticsService.createCarrier(name, code, {
      apiKey,
      apiSecret,
      webhookUrl
    })
    res.json({ carrier })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create carrier' })
  }
})

app.get('/logistics/carriers', async (req, res) => {
  try {
    const carriers = await logisticsService.getCarriers()
    res.json({ carriers })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get carriers' })
  }
})

app.post('/logistics/shipments', async (req, res) => {
  const {
    orderId,
    carrierId,
    originAddress,
    destinationAddress,
    packageDetails,
    shippingCost,
    currency,
    estimatedDelivery
  } = req.body

  try {
    const shipment = await logisticsService.createShipment({
      orderId,
      carrierId,
      originAddress,
      destinationAddress,
      packageDetails,
      shippingCost,
      currency,
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined
    })
    res.json({ shipment })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create shipment' })
  }
})

app.get('/logistics/shipments/:id', async (req, res) => {
  const { id } = req.params
  try {
    const shipment = await logisticsService.getShipment(id)
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }
    res.json({ shipment })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get shipment' })
  }
})

app.get('/logistics/orders/:orderId/shipment', async (req, res) => {
  const { orderId } = req.params
  try {
    const shipment = await logisticsService.getShipmentByOrderId(orderId)
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found for this order' })
    }
    res.json({ shipment })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get shipment' })
  }
})

app.get('/logistics/track/:trackingNumber', async (req, res) => {
  const { trackingNumber } = req.params
  try {
    const shipment = await logisticsService.getShipmentByTrackingNumber(trackingNumber)
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' })
    }
    res.json({ shipment })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get shipment' })
  }
})

app.post('/logistics/shipments/:id/track', async (req, res) => {
  const { id } = req.params
  const { status, description, location, carrierData } = req.body
  try {
    const trackingEvent = await logisticsService.updateTracking({
      shipmentId: id,
      status,
      description,
      location,
      carrierData
    })
    res.json({ trackingEvent })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update tracking' })
  }
})

app.get('/logistics/shipments/:id/tracking', async (req, res) => {
  const { id } = req.params
  try {
    const trackingHistory = await logisticsService.getTrackingHistory(id)
    res.json({ trackingHistory })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get tracking history' })
  }
})

app.post('/logistics/shipments/:id/pod', async (req, res) => {
  const { id } = req.params
  const {
    recipientName,
    recipientSignature,
    recipientPhoto,
    deliveryNotes,
    deliveredBy,
    latitude,
    longitude,
    accuracy
  } = req.body

  try {
    const pod = await logisticsService.recordPOD({
      shipmentId: id,
      recipientName,
      recipientSignature,
      recipientPhoto,
      deliveryNotes,
      deliveredBy,
      latitude,
      longitude,
      accuracy
    })
    res.json({ pod })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to record POD' })
  }
})

app.get('/logistics/shipments/:id/pod', async (req, res) => {
  const { id } = req.params
  try {
    const podRecords = await logisticsService.getPOD(id)
    res.json({ podRecords })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get POD records' })
  }
})

app.get('/logistics/stats', async (req, res) => {
  const { carrierId, status, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (carrierId) filters.carrierId = carrierId
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const stats = await logisticsService.getShipmentStats(filters)
    res.json({ stats })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get shipment stats' })
  }
})

app.get('/logistics/health', async (req, res) => {
  try {
    const health = await logisticsService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Commission & Rewards endpoints
app.post('/commission/loyalty-program', async (req, res) => {
  const { name, description, pointsPerTZS, minOrderAmount, pointsExpiryDays, pointsToTZS, minRedemptionPoints } = req.body
  try {
    const program = await commissionService.createLoyaltyProgram({
      name,
      description,
      pointsPerTZS,
      minOrderAmount,
      pointsExpiryDays,
      pointsToTZS,
      minRedemptionPoints
    })
    res.json({ program })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create loyalty program' })
  }
})

app.post('/commission/referrals', async (req, res) => {
  const { referrerId, refereeEmail, rewardType, rewardValue, expiresInDays } = req.body
  try {
    const referral = await commissionService.createReferral({
      referrerId,
      refereeEmail,
      rewardType,
      rewardValue,
      expiresInDays
    })
    res.json({ referral })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create referral' })
  }
})

app.post('/commission/referrals/apply', async (req, res) => {
  const { email, code } = req.body
  try {
    const referral = await commissionService.applyReferralCode(email, code)
    res.json({ referral })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to apply referral code' })
  }
})

app.post('/commission/referrals/:id/complete', async (req, res) => {
  const { id } = req.params
  const { refereeUserId } = req.body
  try {
    const referral = await commissionService.completeReferral(id, refereeUserId)
    res.json({ referral })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to complete referral' })
  }
})

app.post('/commission/rewards/redeem', async (req, res) => {
  const { userId, pointsToRedeem, rewardType } = req.body
  try {
    const result = await commissionService.redeemLoyaltyPoints({
      userId,
      pointsToRedeem,
      rewardType
    })
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to redeem points' })
  }
})

app.get('/commission/rewards/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    // Get user's rewards from the database
    const rewards = await (prisma as any).reward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ rewards })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get rewards' })
  }
})

app.post('/commission/calculate', async (req, res) => {
  const { orderId, sellerId, enablerId, orderAmount, currency, rates } = req.body
  try {
    const commission = await commissionService.calculateCommission({
      orderId,
      sellerId,
      enablerId,
      orderAmount,
      currency,
      rates
    })
    res.json({ commission })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to calculate commission' })
  }
})

app.post('/commission/:id/pay', async (req, res) => {
  const { id } = req.params
  try {
    const commission = await commissionService.processCommissionPayment(id)
    res.json({ commission })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to process commission payment' })
  }
})

app.get('/commission/stats', async (req, res) => {
  const { sellerId, enablerId, status, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (sellerId) filters.sellerId = sellerId
    if (enablerId) filters.enablerId = enablerId
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const stats = await commissionService.getCommissionStats(filters)
    res.json({ stats })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get commission stats' })
  }
})

app.get('/commission/referrals/stats', async (req, res) => {
  const { referrerId, status, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (referrerId) filters.referrerId = referrerId
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const stats = await commissionService.getReferralStats(filters)
    res.json({ stats })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get referral stats' })
  }
})

app.get('/commission/health', async (req, res) => {
  try {
    const health = await commissionService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Catalog endpoints
app.post('/catalog/categories', async (req, res) => {
  const { name, parentId, description, imageUrl, sortOrder } = req.body
  try {
    const category = await catalogService.createCategory(name, parentId, {
      description,
      imageUrl,
      sortOrder
    })
    res.json({ category })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create category' })
  }
})

app.get('/catalog/categories', async (req, res) => {
  const { includeProducts } = req.query
  try {
    const categories = await catalogService.getCategories(includeProducts === 'true')
    res.json({ categories })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get categories' })
  }
})

app.get('/catalog/categories/:id', async (req, res) => {
  const { id } = req.params
  const { includeProducts } = req.query
  try {
    const category = await catalogService.getCategoryById(id, includeProducts === 'true')
    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json({ category })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get category' })
  }
})

app.put('/catalog/categories/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  try {
    const category = await catalogService.updateCategory(id, updates)
    res.json({ category })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update category' })
  }
})

app.post('/catalog/products', async (req, res) => {
  const productData = req.body
  try {
    const product = await catalogService.createProduct(productData)
    res.json({ product })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create product' })
  }
})

app.get('/catalog/products/:id', async (req, res) => {
  const { id } = req.params
  const { includeVariants, includeMedia } = req.query
  try {
    const product = await catalogService.getProductById(
      id,
      includeVariants === 'true',
      includeMedia === 'true'
    )
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json({ product })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get product' })
  }
})

app.get('/catalog/products/slug/:slug', async (req, res) => {
  const { slug } = req.params
  const { includeVariants, includeMedia } = req.query
  try {
    const product = await catalogService.getProductBySlug(
      slug,
      includeVariants === 'true',
      includeMedia === 'true'
    )
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json({ product })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get product' })
  }
})

app.put('/catalog/products/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  try {
    const product = await catalogService.updateProduct(id, updates)
    res.json({ product })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update product' })
  }
})

app.post('/catalog/products/:id/publish', async (req, res) => {
  const { id } = req.params
  try {
    const product = await catalogService.publishProduct(id)
    res.json({ product })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to publish product' })
  }
})

app.delete('/catalog/products/:id', async (req, res) => {
  const { id } = req.params
  try {
    await catalogService.deleteProduct(id)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete product' })
  }
})

app.get('/catalog/products', async (req, res) => {
  const {
    categoryId,
    sellerId,
    status,
    isActive,
    isFeatured,
    minPrice,
    maxPrice,
    search,
    sort,
    page,
    limit
  } = req.query

  try {
    const filters: any = {}
    if (categoryId) filters.categoryId = categoryId
    if (sellerId) filters.sellerId = sellerId
    if (status) filters.status = status
    if (isActive !== undefined) filters.isActive = isActive === 'true'
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true'
    if (minPrice) filters.minPrice = parseInt(minPrice as string)
    if (maxPrice) filters.maxPrice = parseInt(maxPrice as string)
    if (search) filters.search = search

    const sortOptions = sort ? JSON.parse(sort as string) : undefined

    const result = await catalogService.searchProducts(
      filters,
      sortOptions,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    )
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to search products' })
  }
})

app.post('/catalog/products/:id/variants', async (req, res) => {
  const { id } = req.params
  const variantData = { ...req.body, productId: id }
  try {
    const variant = await catalogService.createProductVariant(variantData)
    res.json({ variant })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create variant' })
  }
})

app.put('/catalog/products/variants/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  try {
    const variant = await catalogService.updateProductVariant(id, updates)
    res.json({ variant })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update variant' })
  }
})

app.delete('/catalog/products/variants/:id', async (req, res) => {
  const { id } = req.params
  try {
    await catalogService.deleteProductVariant(id)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete variant' })
  }
})

app.post('/catalog/products/:id/media', async (req, res) => {
  const { id } = req.params
  const mediaData = { ...req.body, productId: id }
  try {
    const media = await catalogService.addProductMedia(mediaData)
    res.json({ media })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to add media' })
  }
})

app.put('/catalog/products/media/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  try {
    const media = await catalogService.updateProductMedia(id, updates)
    res.json({ media })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update media' })
  }
})

app.delete('/catalog/products/media/:id', async (req, res) => {
  const { id } = req.params
  try {
    await catalogService.deleteProductMedia(id)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete media' })
  }
})

app.post('/catalog/products/:id/attributes', async (req, res) => {
  const { id } = req.params
  const { name, value, type, isFilterable, isSearchable, sortOrder } = req.body
  try {
    const attribute = await catalogService.addProductAttribute(id, name, value, {
      type,
      isFilterable,
      isSearchable,
      sortOrder
    })
    res.json({ attribute })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to add attribute' })
  }
})

app.put('/catalog/products/attributes/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  try {
    const attribute = await catalogService.updateProductAttribute(id, updates)
    res.json({ attribute })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update attribute' })
  }
})

app.delete('/catalog/products/attributes/:id', async (req, res) => {
  const { id } = req.params
  try {
    await catalogService.deleteProductAttribute(id)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete attribute' })
  }
})

app.post('/catalog/products/bulk-status', async (req, res) => {
  const { productIds, status, reason } = req.body
  try {
    const results = await catalogService.bulkUpdateProductStatus(productIds, status, reason)
    res.json({ results })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bulk update failed' })
  }
})

app.post('/catalog/products/bulk-category', async (req, res) => {
  const { productIds, categoryId } = req.body
  try {
    const results = await catalogService.bulkUpdateProductCategory(productIds, categoryId)
    res.json({ results })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bulk category update failed' })
  }
})

app.get('/catalog/stats', async (req, res) => {
  const { sellerId, categoryId, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (sellerId) filters.sellerId = sellerId
    if (categoryId) filters.categoryId = categoryId
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const stats = await catalogService.getProductStats(filters)
    res.json({ stats })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get product stats' })
  }
})

app.get('/catalog/health', async (req, res) => {
  try {
    const health = await catalogService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Trust & Reviews endpoints
app.post('/trust/reviews', async (req, res) => {
  const reviewData = req.body
  try {
    const review = await trustService.createReview(reviewData)
    res.json({ review })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create review' })
  }
})

app.get('/trust/reviews/:id', async (req, res) => {
  const { id } = req.params
  try {
    const review = await trustService.getReviewById(id)
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    res.json({ review })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get review' })
  }
})

app.put('/trust/reviews/:id', async (req, res) => {
  const { id } = req.params
  const { reviewerId, ...updates } = req.body
  try {
    const review = await trustService.updateReview(id, reviewerId, updates)
    res.json({ review })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update review' })
  }
})

app.delete('/trust/reviews/:id', async (req, res) => {
  const { id } = req.params
  const { reviewerId } = req.body
  try {
    await trustService.deleteReview(id, reviewerId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete review' })
  }
})

app.post('/trust/reviews/:id/vote', async (req, res) => {
  const { id } = req.params
  const { userId, voteType } = req.body
  try {
    await trustService.voteOnReview(id, userId, voteType)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to vote on review' })
  }
})

app.post('/trust/reviews/:id/report', async (req, res) => {
  const { id } = req.params
  const reportData = req.body
  try {
    const report = await trustService.reportReview(id, reportData.reporterId, reportData.reason, reportData.description)
    res.json({ report })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to report review' })
  }
})

app.post('/trust/reviews/:id/moderate', async (req, res) => {
  const { id } = req.params
  const { moderatorId, action, reason } = req.body
  try {
    const review = await trustService.moderateReview(id, moderatorId, action, reason)
    res.json({ review })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to moderate review' })
  }
})

app.post('/trust/reviews/:id/respond', async (req, res) => {
  const { id } = req.params
  const { sellerId, response } = req.body
  try {
    const review = await trustService.respondToReview(id, sellerId, response)
    res.json({ review })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to respond to review' })
  }
})

app.get('/trust/reviews', async (req, res) => {
  const { productId, sellerId, reviewerId, rating, status, isVerified, sortBy, page, limit } = req.query
  try {
    const filters: any = {}
    if (productId) filters.productId = productId
    if (sellerId) filters.sellerId = sellerId
    if (reviewerId) filters.reviewerId = reviewerId
    if (rating) filters.rating = parseInt(rating as string)
    if (status) filters.status = status
    if (isVerified !== undefined) filters.isVerified = isVerified === 'true'
    if (sortBy) filters.sortBy = sortBy

    const result = await trustService.searchReviews(filters, parseInt(page as string) || 1, parseInt(limit as string) || 20)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to search reviews' })
  }
})

// Dispute Resolution endpoints
app.post('/trust/disputes', async (req, res) => {
  const disputeData = req.body
  try {
    const dispute = await trustService.createDispute(disputeData)
    res.json({ dispute })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create dispute' })
  }
})

app.get('/trust/disputes/:id', async (req, res) => {
  const { id } = req.params
  try {
    const dispute = await trustService.getDisputeById(id)
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' })
    }
    res.json({ dispute })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get dispute' })
  }
})

app.put('/trust/disputes/:id/status', async (req, res) => {
  const { id } = req.params
  const { status, adminId } = req.body
  try {
    const dispute = await trustService.updateDisputeStatus(id, status, adminId)
    res.json({ dispute })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update dispute status' })
  }
})

app.post('/trust/disputes/:id/resolve', async (req, res) => {
  const { id } = req.params
  const { adminId, ...resolution } = req.body
  try {
    const dispute = await trustService.resolveDispute(id, adminId, resolution)
    res.json({ dispute })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to resolve dispute' })
  }
})

app.post('/trust/disputes/:id/escalate', async (req, res) => {
  const { id } = req.params
  const { reason } = req.body
  try {
    const dispute = await trustService.escalateDispute(id, reason)
    res.json({ dispute })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to escalate dispute' })
  }
})

// Trust Score endpoints
app.get('/trust/scores/:entityId/:entityType', async (req, res) => {
  const { entityId, entityType } = req.params
  try {
    const score = await trustService.getTrustScore(entityId, entityType as 'product' | 'seller')
    if (!score) {
      return res.status(404).json({ error: 'Trust score not found' })
    }
    res.json({ score })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get trust score' })
  }
})

// Analytics endpoints
app.get('/trust/analytics/reviews', async (req, res) => {
  const { sellerId, productId, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (sellerId) filters.sellerId = sellerId
    if (productId) filters.productId = productId
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const analytics = await trustService.getReviewAnalytics(filters)
    res.json({ analytics })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get review analytics' })
  }
})

app.get('/trust/analytics/disputes', async (req, res) => {
  const { sellerId, status, fromDate, toDate } = req.query
  try {
    const filters: any = {}
    if (sellerId) filters.sellerId = sellerId
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)

    const analytics = await trustService.getDisputeAnalytics(filters)
    res.json({ analytics })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get dispute analytics' })
  }
})

app.get('/trust/health', async (req, res) => {
  try {
    const health = await trustService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Notification endpoints
app.post('/notifications/templates', async (req, res) => {
  const templateData = req.body
  try {
    const template = await notificationService.createTemplate(templateData)
    res.json({ template })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create template' })
  }
})

app.get('/notifications/templates', async (req, res) => {
  const { type, channel, language, activeOnly } = req.query
  try {
    const templates = await notificationService.listTemplates({
      type: type as any,
      channel: channel as any,
      language: language as string,
      activeOnly: activeOnly !== 'false'
    })
    res.json({ templates })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get templates' })
  }
})

app.put('/notifications/templates/:name', async (req, res) => {
  const { name } = req.params
  const updates = req.body
  try {
    const template = await notificationService.updateTemplate(name, updates)
    res.json({ template })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update template' })
  }
})

app.delete('/notifications/templates/:name', async (req, res) => {
  const { name } = req.params
  try {
    await notificationService.deleteTemplate(name)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete template' })
  }
})

app.post('/notifications/send', async (req, res) => {
  const notificationData = req.body
  try {
    const notification = await notificationService.sendNotification(notificationData)
    res.json({ notification })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to send notification' })
  }
})

app.post('/notifications/send-bulk', async (req, res) => {
  const bulkData = req.body
  try {
    const result = await notificationService.sendBulkNotification(bulkData)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to send bulk notifications' })
  }
})

app.get('/notifications/user/:userId', async (req, res) => {
  const { userId } = req.params
  const { type, channel, status, limit, offset } = req.query
  try {
    const notifications = await notificationService.getUserNotifications(userId, {
      type: type as any,
      channel: channel as any,
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    })
    res.json(notifications)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get notifications' })
  }
})

app.get('/notifications/:id', async (req, res) => {
  const { id } = req.params
  try {
    const notification = await notificationService.getNotificationStatus(id)
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    res.json({ notification })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get notification' })
  }
})

// User Preferences endpoints
app.get('/notifications/preferences/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const preferences = await notificationService.getUserPreferences(userId)
    res.json({ preferences })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get preferences' })
  }
})

app.put('/notifications/preferences/:userId', async (req, res) => {
  const { userId } = req.params
  const preferences = req.body
  try {
    const updatedPreferences = await notificationService.updateUserPreferences(userId, preferences)
    res.json({ preferences: updatedPreferences })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update preferences' })
  }
})

// Campaign Management endpoints
app.post('/notifications/campaigns', async (req, res) => {
  const campaignData = req.body
  try {
    const campaign = await notificationService.createCampaign(campaignData)
    res.json({ campaign })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create campaign' })
  }
})

app.post('/notifications/campaigns/:id/execute', async (req, res) => {
  const { id } = req.params
  try {
    const result = await notificationService.executeCampaign(id)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to execute campaign' })
  }
})

// Analytics endpoints
app.get('/notifications/analytics', async (req, res) => {
  const { fromDate, toDate, channel, type } = req.query
  try {
    const filters: any = {}
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)
    if (channel) filters.channel = channel
    if (type) filters.type = type

    const analytics = await notificationService.getNotificationAnalytics(filters)
    res.json({ analytics })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get analytics' })
  }
})

app.get('/notifications/health', async (req, res) => {
  try {
    const health = await notificationService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Community endpoints
app.post('/community/posts', async (req, res) => {
  const postData = req.body
  try {
    const post = await communityService.createPost(postData)
    res.json({ post })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create post' })
  }
})

app.get('/community/posts/:id', async (req, res) => {
  const { id } = req.params
  const { userId } = req.query
  try {
    const post = await communityService.getPostById(id, userId as string)
    res.json({ post })
  } catch (e) {
    res.status(404).json({ error: e instanceof Error ? e.message : 'Post not found' })
  }
})

app.put('/community/posts/:id', async (req, res) => {
  const { id } = req.params
  const { authorId, ...updates } = req.body
  try {
    const post = await communityService.updatePost(id, authorId, updates)
    res.json({ post })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update post' })
  }
})

app.delete('/community/posts/:id', async (req, res) => {
  const { id } = req.params
  const { authorId } = req.body
  try {
    await communityService.deletePost(id, authorId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete post' })
  }
})

app.post('/community/posts/:id/like', async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  try {
    const result = await communityService.toggleLikePost(id, userId)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to like post' })
  }
})

app.post('/community/posts/:id/save', async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  try {
    const saved = await communityService.savePost(id, userId)
    res.json({ saved })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to save post' })
  }
})

app.get('/community/posts', async (req, res) => {
  const { userId, followedOnly, tags, sortBy, page, limit } = req.query
  try {
    const filters: any = {}
    if (userId) filters.userId = userId
    if (followedOnly) filters.followedOnly = followedOnly === 'true'
    if (tags) filters.tags = tags.toString().split(',')
    if (sortBy) filters.sortBy = sortBy

    const result = await communityService.getFeedPosts(filters, parseInt(page as string) || 1, parseInt(limit as string) || 20)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get posts' })
  }
})

app.get('/community/posts/search', async (req, res) => {
  const { query, authorId, tags, privacy, status, fromDate, toDate, sortBy, page, limit } = req.query
  try {
    const filters: any = {}
    if (query) filters.query = query
    if (authorId) filters.authorId = authorId
    if (tags) filters.tags = tags.toString().split(',')
    if (privacy) filters.privacy = privacy
    if (status) filters.status = status
    if (fromDate) filters.fromDate = new Date(fromDate as string)
    if (toDate) filters.toDate = new Date(toDate as string)
    if (sortBy) filters.sortBy = sortBy

    const result = await communityService.searchPosts(filters, parseInt(page as string) || 1, parseInt(limit as string) || 20)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to search posts' })
  }
})

app.get('/community/posts/user/:userId', async (req, res) => {
  const { userId } = req.params
  const { currentUserId, page, limit } = req.query
  try {
    const result = await communityService.getUserPosts(userId, currentUserId as string, parseInt(page as string) || 1, parseInt(limit as string) || 20)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get user posts' })
  }
})

app.get('/community/posts/saved/:userId', async (req, res) => {
  const { userId } = req.params
  const { page, limit } = req.query
  try {
    const result = await communityService.getSavedPosts(userId, parseInt(page as string) || 1, parseInt(limit as string) || 20)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get saved posts' })
  }
})

// Comment endpoints
app.post('/community/comments', async (req, res) => {
  const commentData = req.body
  try {
    const comment = await communityService.createComment(commentData)
    res.json({ comment })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create comment' })
  }
})

app.put('/community/comments/:id', async (req, res) => {
  const { id } = req.params
  const { authorId, ...updates } = req.body
  try {
    const comment = await communityService.updateComment(id, authorId, updates)
    res.json({ comment })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update comment' })
  }
})

app.delete('/community/comments/:id', async (req, res) => {
  const { id } = req.params
  const { authorId } = req.body
  try {
    await communityService.deleteComment(id, authorId)
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to delete comment' })
  }
})

app.post('/community/comments/:id/like', async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  try {
    const result = await communityService.toggleLikeComment(id, userId)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to like comment' })
  }
})

app.get('/community/posts/:postId/comments', async (req, res) => {
  const { postId } = req.params
  const { userId, page, limit } = req.query
  try {
    const result = await communityService.getPostComments(postId, userId as string, parseInt(page as string) || 1, parseInt(limit as string) || 20)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get post comments' })
  }
})

// Tag endpoints
app.get('/community/tags/trending', async (req, res) => {
  const { limit } = req.query
  try {
    const tags = await communityService.getTrendingTags(parseInt(limit as string) || 10)
    res.json({ tags })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get trending tags' })
  }
})

// Moderation endpoints
app.post('/community/posts/:id/moderate', async (req, res) => {
  const { id } = req.params
  const { moderatorId, action } = req.body
  try {
    const post = await communityService.moderatePost(id, moderatorId, action)
    res.json({ post })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to moderate post' })
  }
})

app.post('/community/comments/:id/moderate', async (req, res) => {
  const { id } = req.params
  const { moderatorId, action } = req.body
  try {
    const comment = await communityService.moderateComment(id, moderatorId, action)
    res.json({ comment })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to moderate comment' })
  }
})

// Analytics endpoints
app.get('/community/analytics', async (req, res) => {
  const { fromDate, toDate } = req.query
  try {
    const from = fromDate ? new Date(fromDate as string) : undefined
    const to = toDate ? new Date(toDate as string) : undefined

    const analytics = await communityService.getCommunityAnalytics(from, to)
    res.json({ analytics })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get analytics' })
  }
})

app.get('/community/health', async (req, res) => {
  try {
    const health = await communityService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// Analytics endpoints
app.post('/analytics/events', async (req, res) => {
  const eventData = req.body
  try {
    const eventFact = await analyticsService.storeEventFact(eventData)
    res.json({ eventFact })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to store event' })
  }
})

app.get('/analytics/events', async (req, res) => {
  const { eventType, aggregateId, fromDate, toDate, limit, offset } = req.query
  try {
    const events = await analyticsService.getEventFacts({
      eventType: eventType as string,
      aggregateId: aggregateId as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    })
    res.json({ events })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get events' })
  }
})

app.post('/analytics/metrics', async (req, res) => {
  const metricData = req.body
  try {
    const metric = await analyticsService.recordMetric(metricData)
    res.json({ metric })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to record metric' })
  }
})

app.get('/analytics/metrics/:name', async (req, res) => {
  const { name } = req.params
  const { dimensions, fromDate, toDate } = req.query
  try {
    let parsedDimensions: Record<string, any> | undefined
    if (dimensions) {
      parsedDimensions = JSON.parse(dimensions as string)
    }

    const metrics = await analyticsService.getMetric(
      name,
      parsedDimensions,
      fromDate ? new Date(fromDate as string) : undefined,
      toDate ? new Date(toDate as string) : undefined
    )
    res.json({ metrics })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get metrics' })
  }
})

app.post('/analytics/query', async (req, res) => {
  const query = req.body
  try {
    const result = await analyticsService.aggregateMetrics(query)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to query analytics' })
  }
})

app.get('/analytics/business', async (req, res) => {
  const { period } = req.query
  try {
    const metrics = await analyticsService.getBusinessMetrics(period as any || 'daily')
    res.json({ metrics })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get business metrics' })
  }
})

// Dashboard Management endpoints
app.post('/analytics/dashboards', async (req, res) => {
  const dashboardData = req.body
  try {
    const dashboard = await analyticsService.createDashboard(dashboardData.config, dashboardData.createdBy)
    res.json({ dashboard })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create dashboard' })
  }
})

app.get('/analytics/dashboards/:id', async (req, res) => {
  const { id } = req.params
  try {
    const dashboard = await analyticsService.getDashboard(id)
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' })
    }
    res.json({ dashboard })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get dashboard' })
  }
})

app.put('/analytics/dashboards/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body
  try {
    const dashboard = await analyticsService.updateDashboard(id, updates)
    res.json({ dashboard })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update dashboard' })
  }
})

app.get('/analytics/dashboards', async (req, res) => {
  const { userId } = req.query
  try {
    const dashboards = await analyticsService.listDashboards(userId as string)
    res.json({ dashboards })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get dashboards' })
  }
})

// Report Management endpoints
app.post('/analytics/reports', async (req, res) => {
  const reportData = req.body
  try {
    const report = await analyticsService.createReport(reportData.config, reportData.createdBy)
    res.json({ report })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create report' })
  }
})

app.post('/analytics/reports/:id/execute', async (req, res) => {
  const { id } = req.params
  try {
    const result = await analyticsService.executeReport(id)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to execute report' })
  }
})

// Alert Management endpoints
app.post('/analytics/alerts', async (req, res) => {
  const alertData = req.body
  try {
    const alert = await analyticsService.createAlert(alertData)
    res.json({ alert })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create alert' })
  }
})

app.get('/analytics/alerts', async (req, res) => {
  const { activeOnly } = req.query
  try {
    const alerts = await analyticsService.getAlerts(activeOnly !== 'false')
    res.json({ alerts })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Failed to get alerts' })
  }
})

// User Behavior Analytics
app.post('/analytics/sessions', async (req, res) => {
  const sessionData = req.body
  try {
    const session = await analyticsService.trackUserSession(sessionData)
    res.json({ session })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to track session' })
  }
})

app.post('/analytics/products/:productId/view', async (req, res) => {
  const { productId } = req.params
  const viewData = req.body
  try {
    const view = await analyticsService.trackProductView({
      productId,
      ...viewData
    })
    res.json({ view })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to track product view' })
  }
})

// Performance Monitoring
app.post('/analytics/performance', async (req, res) => {
  const metricData = req.body
  try {
    const metric = await analyticsService.trackPerformanceMetric(metricData)
    res.json({ metric })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to track performance' })
  }
})

// Revenue Analytics
app.post('/analytics/revenue', async (req, res) => {
  const { period } = req.body
  try {
    const metrics = await analyticsService.calculateRevenueMetrics(period)
    res.json({ metrics })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to calculate revenue metrics' })
  }
})

app.get('/analytics/health', async (req, res) => {
  try {
    const health = await analyticsService.healthCheck()
    res.json(health)
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Health check failed' })
  }
})

// API Gateway Versioned Routes
// V1 Routes (Legacy)
app.get('/v1/health', (req: any, res: any) => {
  res.json({
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: 'legacy'
  })
})

app.get('/v1/users/:id', authMiddleware.authenticateAny, (req: any, res: any) => {
  const { id } = req.params
  res.json({
    version: 'v1',
    userId: id,
    data: { name: 'Legacy User', version: 'v1' }
  })
})

// V2 Routes (Enhanced)
app.get('/v2/health', (req: any, res: any) => {
  res.json({
    version: 'v2',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api: 'enhanced',
    features: ['authentication', 'rate-limiting', 'versioning']
  })
})

app.get('/v2/users/:id',
  authMiddleware.authenticateAny,
  authMiddleware.authorize(['read_profile']),
  (req: any, res: any) => {
    const { id } = req.params
    res.json({
      version: 'v2',
      userId: id,
      authenticated: req.isAuthenticated,
      permissions: req.permissions,
      data: {
        name: 'Enhanced User',
        version: 'v2',
        features: ['enhanced_security', 'detailed_permissions']
      }
    })
  }
)

// API Gateway Status Route
app.get('/api/status', (req, res) => {
  res.json({
    gateway: 'active',
    version: '1.0.0',
    features: [
      'JWT Authentication',
      'API Key Support',
      'Rate Limiting',
      'API Versioning',
      'Security Headers',
      'CORS Support',
      'Request Logging'
    ],
    endpoints: {
      v1: '/v1/*',
      v2: '/v2/*',
      admin: '/admin/*',
      auth: '/auth/*'
    }
  })
})

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global error handler:', err)

  // Don't leak sensitive error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production'

  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  })
})

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'API endpoint not found',
      path: req.path,
      method: req.method,
      availableVersions: ['v1', 'v2'],
      suggestion: req.path.startsWith('/v1') || req.path.startsWith('/v2')
        ? null
        : 'Try adding /v1/ or /v2/ prefix to your request'
    }
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`)
  console.log(`📡 Health check: http://localhost:${PORT}/api/status`)
  console.log(`🔐 Authentication: JWT Bearer tokens or X-API-Key headers`)
  console.log(`📊 Rate limiting: 100 requests per 15 minutes per IP`)
  console.log(`🏷️  API versioning: /v1/* and /v2/* routes supported`)
})
