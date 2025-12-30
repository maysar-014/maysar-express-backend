import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { EventEnvelope } from '../../../shared-contracts/types'
import { AdminOverrideAppliedEvent } from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'
import { OrderService } from '../order/order'
import { PaymentService } from '../payment/payment'
import { AuthService } from '../auth/auth'

// Admin roles with permissions
export enum AdminRole {
  SUPPORT = 'support',
  OPS = 'ops',
  FINANCE = 'finance',
  COMPLIANCE = 'compliance',
  SUPER = 'super'
}

// Permission matrix
const PERMISSIONS = {
  [AdminRole.SUPPORT]: {
    view_orders: true,
    cancel_order: false,
    force_refund: false,
    wallet_credit: false,
    freeze_wallet: false,
    suspend_seller: false,
    override_kyc: false,
    delete_financial: false
  },
  [AdminRole.OPS]: {
    view_orders: true,
    cancel_order: true,
    force_refund: false,
    wallet_credit: false,
    freeze_wallet: false,
    suspend_seller: true,
    override_kyc: false,
    delete_financial: false
  },
  [AdminRole.FINANCE]: {
    view_orders: true,
    cancel_order: false,
    force_refund: true,
    wallet_credit: true,
    freeze_wallet: false,
    suspend_seller: false,
    override_kyc: false,
    delete_financial: false
  },
  [AdminRole.COMPLIANCE]: {
    view_orders: true,
    cancel_order: false,
    force_refund: false,
    wallet_credit: false,
    freeze_wallet: true,
    suspend_seller: true,
    override_kyc: true,
    delete_financial: false
  },
  [AdminRole.SUPER]: {
    view_orders: true,
    cancel_order: true,
    force_refund: true,
    wallet_credit: true,
    freeze_wallet: true,
    suspend_seller: true,
    override_kyc: true,
    delete_financial: false
  }
}

// Two-person approval thresholds (in cents)
const APPROVAL_THRESHOLDS = {
  FORCE_REFUND: 100000,    // 1000 TZS
  WALLET_CREDIT: 50000,    // 500 TZS
  FREEZE_WALLET: 0,        // Always require approval
  OVERRIDE_KYC: 0,         // Always require approval
  SUSPEND_SELLER: 0,       // Always require approval
  CANCEL_ORDER: 200000     // 2000 TZS threshold
}

export interface AdminAction {
  adminId: string
  action: string
  entityType: string
  entityId: string
  reason: string
  justification: string // Detailed business justification
  riskAssessment: 'low' | 'medium' | 'high' | 'critical'
  previousState?: any
  newState?: any
  approvers?: string[]
  amount?: number // For financial actions
  ipAddress?: string
  userAgent?: string
}

export interface PendingApproval {
  id: string
  action: AdminAction
  requestedAt: Date
  expiresAt: Date
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  requiredApprovers: number // Number of approvals needed
  currentApprovers: string[] // Who has approved so far
  rejectionReason?: string
  priority: 'normal' | 'urgent' | 'critical'
}

export interface AuditTrailEntry {
  id: string
  adminId: string
  action: string
  entityType: string
  entityId: string
  reason: string
  justification: string
  riskAssessment: string
  previousState: string | null
  newState: string | null
  approvers: string[]
  ipAddress: string
  userAgent: string
  checksum: string // For integrity verification
  timestamp: Date
  complianceFlags: string[] // GDPR, PCI, etc.
}

export class AdminService {
  private orderService: OrderService
  private paymentService: PaymentService
  private authService: AuthService
  private pendingApprovals: Map<string, PendingApproval> = new Map()

  constructor(orderService: OrderService, paymentService: PaymentService, authService: AuthService) {
    this.orderService = orderService
    this.paymentService = paymentService
    this.authService = authService

    // Clean up expired approvals every hour
    setInterval(() => this.cleanupExpiredApprovals(), 60 * 60 * 1000)
  }

  // Admin Authentication
  async authenticateAdmin(email: string, password: string) {
    const admin = await (prisma as any).admin.findUnique({ where: { email } })
    if (!admin || !admin.isActive) {
      throw new Error('Invalid admin credentials')
    }

    const isValidPassword = await bcrypt.compare(password, admin.password)
    if (!isValidPassword) {
      throw new Error('Invalid admin credentials')
    }

    const token = jwt.sign(
      { adminId: admin.id, role: admin.role },
      process.env.JWT_SECRET || 'admin-secret',
      { expiresIn: '8h' }
    )

    return { admin, token }
  }

  async createAdmin(email: string, password: string, role: AdminRole) {
    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await (prisma as any).admin.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    })

    return admin
  }

  // Check if admin has permission for an action
  hasPermission(adminRole: AdminRole, action: keyof typeof PERMISSIONS[AdminRole]): boolean {
    return PERMISSIONS[adminRole][action] || false
  }

  // Get admin by ID with role
  async getAdminById(adminId: string) {
    const admin = await (prisma as any).admin.findUnique({ where: { id: adminId } })
    return admin
  }

  // Request admin action (with two-person approval if needed)
  async requestAction(action: AdminAction): Promise<string | void> {
    const admin = await this.getAdminById(action.adminId)
    if (!admin) throw new Error('Admin not found')

    // Check permissions
    const requiredPermission = this.getPermissionForAction(action.action)
    if (!this.hasPermission(admin.role as AdminRole, requiredPermission)) {
      throw new Error(`Insufficient permissions for action: ${action.action}`)
    }

    // Check if two-person approval is required
    if (this.requiresTwoPersonApproval(action)) {
      const approvalId = uuidv4()
      const requiredApprovers = this.getRequiredApproversCount(action)
      const approval: PendingApproval = {
        id: approvalId,
        action,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending',
        requiredApprovers,
        currentApprovers: [],
        priority: this.getActionPriority(action)
      }

      this.pendingApprovals.set(approvalId, approval)
      return approvalId // Return approval ID for tracking
    }

    // Execute immediately if no approval needed
    await this.executeAction(action)
  }

  // Approve pending action
  async approveAction(approvalId: string, approverAdminId: string): Promise<void> {
    const approval = this.pendingApprovals.get(approvalId)
    if (!approval) throw new Error('Approval request not found')

    if (approval.status !== 'pending') {
      throw new Error('Approval request is not pending')
    }

    if (new Date() > approval.expiresAt) {
      approval.status = 'expired'
      throw new Error('Approval request has expired')
    }

    // Add approver to the action
    approval.action.approvers = approval.action.approvers || []
    approval.action.approvers.push(approverAdminId)

    // Execute the action
    await this.executeAction(approval.action)

    // Mark as approved
    approval.status = 'approved'
  }

  // Execute admin action with audit logging
  async executeAction(action: AdminAction): Promise<void> {
    // Get current state for audit
    const currentState = await this.getCurrentState(action.entityType, action.entityId)

    // Execute the specific action
    await this.executeSpecificAction(action)

    // Get new state for audit
    const newState = await this.getCurrentState(action.entityType, action.entityId)

    // Create audit log entry
    const auditAction = {
      ...action,
      previousState: currentState,
      newState: newState
    }

    await this.createAuditLog(auditAction)

    // Emit event using helper function
    const envelope = eventBus.createEventEnvelope<AdminOverrideAppliedEvent>('AdminOverrideApplied', {
      adminId: action.adminId,
      action: action.action,
      entityType: action.entityType,
      entityId: action.entityId,
      reason: action.reason,
      previousState: currentState,
      newState: newState
    })

    eventBus.publish(envelope)
  }

  private requiresTwoPersonApproval(action: AdminAction): boolean {
    const threshold = APPROVAL_THRESHOLDS[action.action as keyof typeof APPROVAL_THRESHOLDS]
    if (threshold === undefined) return false
    if (threshold === 0) return true

    return (action.amount || 0) >= threshold
  }

  private getRequiredApproversCount(action: AdminAction): number {
    // High-risk actions require 2 approvers
    if (action.riskAssessment === 'critical' ||
        action.action === 'FREEZE_WALLET' ||
        action.action === 'OVERRIDE_KYC') {
      return 2
    }

    // Medium-risk actions require 1 approver
    if (action.riskAssessment === 'high' ||
        (action.amount && action.amount >= 100000)) { // 1000 TZS
      return 1
    }

    // Low-risk actions can be auto-approved
    return 0
  }

  private getActionPriority(action: AdminAction): 'normal' | 'urgent' | 'critical' {
    if (action.riskAssessment === 'critical' ||
        action.action === 'FREEZE_WALLET' ||
        action.action === 'OVERRIDE_KYC') {
      return 'critical'
    }

    if (action.riskAssessment === 'high' ||
        (action.amount && action.amount >= 500000)) { // 5000 TZS
      return 'urgent'
    }

    return 'normal'
  }

  private getPermissionForAction(action: string): keyof typeof PERMISSIONS[AdminRole] {
    const permissionMap: Record<string, keyof typeof PERMISSIONS[AdminRole]> = {
      'CANCEL_ORDER': 'cancel_order',
      'FORCE_REFUND': 'force_refund',
      'WALLET_CREDIT': 'wallet_credit',
      'FREEZE_WALLET': 'freeze_wallet',
      'SUSPEND_SELLER': 'suspend_seller',
      'OVERRIDE_KYC': 'override_kyc'
    }
    return permissionMap[action] || 'view_orders'
  }

  private async getCurrentState(entityType: string, entityId: string): Promise<any> {
    try {
      switch (entityType) {
        case 'ORDER':
          // Note: This would need cross-service communication in microservices
          // For now, return basic info
          return { id: entityId, type: 'order' }
        case 'PAYMENT':
          return { id: entityId, type: 'payment' }
        case 'USER':
          return { id: entityId, type: 'user' }
        default:
          return { id: entityId, type: entityType.toLowerCase() }
      }
    } catch (error) {
      return { error: 'Could not retrieve current state' }
    }
  }

  private async executeSpecificAction(action: AdminAction): Promise<void> {
    switch (action.action) {
      case 'CANCEL_ORDER':
        // This would integrate with Order service
        // For now, we'll implement a placeholder
        console.log(`Cancelling order ${action.entityId}: ${action.reason}`)
        break

      case 'FORCE_REFUND':
        // Integrate with Payment service
        try {
          await this.paymentService.refundPayment(action.entityId, action.amount, action.reason)
        } catch (error) {
          console.error('Refund failed:', error)
          throw new Error('Refund execution failed')
        }
        break

      case 'WALLET_CREDIT':
        // This would need wallet service integration
        console.log(`Crediting wallet for user ${action.entityId}: ${action.amount} ${action.reason}`)
        break

      case 'FREEZE_WALLET':
        // This would need wallet service integration
        console.log(`Freezing wallet for user ${action.entityId}: ${action.reason}`)
        break

      case 'SUSPEND_SELLER':
        // This would need user service integration
        console.log(`Suspending seller ${action.entityId}: ${action.reason}`)
        break

      case 'OVERRIDE_KYC':
        // This would need seller service integration
        console.log(`Overriding KYC for seller ${action.entityId}: ${action.reason}`)
        break

      default:
        throw new Error(`Unknown admin action: ${action.action}`)
    }
  }

  private async createAuditLog(action: AdminAction): Promise<void> {
    await (prisma as any).auditLog.create({
      data: {
        adminId: action.adminId,
        action: action.action,
        entityType: action.entityType,
        entityId: action.entityId,
        reason: action.reason,
        previousState: action.previousState ? JSON.stringify(action.previousState) : null,
        newState: action.newState ? JSON.stringify(action.newState) : null,
        timestamp: new Date(),
        approvers: action.approvers || []
      }
    })
  }

  // Get audit logs with filtering
  async getAuditLogs(filters?: {
    adminId?: string
    action?: string
    entityType?: string
    fromDate?: Date
    toDate?: Date
  }) {
    const where: any = {}
    if (filters?.adminId) where.adminId = filters.adminId
    if (filters?.action) where.action = filters.action
    if (filters?.entityType) where.entityType = filters.entityType
    if (filters?.fromDate || filters?.toDate) {
      where.timestamp = {}
      if (filters.fromDate) where.timestamp.gte = filters.fromDate
      if (filters.toDate) where.timestamp.lte = filters.toDate
    }

    return await (prisma as any).auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        admin: {
          select: { email: true, role: true }
        }
      }
    })
  }

  // Get pending approvals for an admin
  async getPendingApprovals(adminId: string) {
    const admin = await this.getAdminById(adminId)
    if (!admin) return []

    const approvals = Array.from(this.pendingApprovals.values())
      .filter(approval =>
        approval.status === 'pending' &&
        new Date() <= approval.expiresAt &&
        approval.action.adminId !== adminId // Can't approve your own requests
      )

    return approvals
  }

  // Clean up expired approvals
  private cleanupExpiredApprovals(): void {
    const now = new Date()
    for (const [id, approval] of this.pendingApprovals) {
      if (now > approval.expiresAt && approval.status === 'pending') {
        approval.status = 'expired'
      }
    }
  }

  // Dashboard data
  async getDashboardStats() {
    const [
      totalAdmins,
      totalAuditLogs,
      recentActions,
      pendingApprovals
    ] = await Promise.all([
      (prisma as any).admin.count(),
      (prisma as any).auditLog.count(),
      (prisma as any).auditLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: { admin: { select: { email: true } } }
      }),
      Promise.resolve(Array.from(this.pendingApprovals.values()).filter(a => a.status === 'pending').length)
    ])

    return {
      totalAdmins,
      totalAuditLogs,
      recentActions,
      pendingApprovals
    }
  }
}
