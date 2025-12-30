import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { UserRole, EventEnvelope, Money } from '../../../shared-contracts/types'
import { UserRegisteredEvent, UserSuspendedEvent } from '../../../shared-contracts/events'
import { enhancedEventBus as eventBus } from '../../events/eventBus'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret'

// Security configuration
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 30
const SESSION_DURATION_HOURS = 8
const REFRESH_TOKEN_DURATION_DAYS = 30

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
  DEACTIVATED = 'deactivated'
}

export enum OTPType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  MFA_SETUP = 'mfa_setup',
  LOGIN_MFA = 'login_mfa'
}

export interface UserProfile {
  firstName?: string
  lastName?: string
  phone?: string
  dateOfBirth?: Date
  gender?: 'male' | 'female' | 'other'
  address?: {
    street: string
    city: string
    region: string
    postalCode?: string
    country: string
  }
  preferences?: {
    language: string
    timezone: string
    currency: string
    notifications: boolean
  }
}

export interface RegistrationRequest {
  email: string
  password: string
  role?: UserRole
  profile?: UserProfile
  referralCode?: string
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
  ipAddress?: string
  userAgent?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface PasswordResetRequest {
  email: string
  resetToken?: string
  newPassword?: string
}

export class AuthService {
  // User Management
  async register(request: RegistrationRequest): Promise<any> {
    const { email, password, role = 'buyer', profile, referralCode } = request

    // Validate email uniqueness
    const existingUser = await (prisma as any).user.findUnique({ where: { email } })
    if (existingUser) {
      throw new Error('Email already registered')
    }

    // Validate password strength
    this.validatePasswordStrength(password)

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await (prisma as any).user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        isActive: true
      }
    })

    // Create email verification OTP
    await this.generateOTP(user.id, email, OTPType.EMAIL_VERIFICATION)

    // Emit UserRegistered event using helper function
    const envelope = eventBus.createEventEnvelope<UserRegisteredEvent>('UserRegistered', {
      userId: user.id,
      email,
      role
    })

    eventBus.publish(envelope)

    return {
      user: { id: user.id, email: user.email, role: user.role },
      requiresEmailVerification: true
    }
  }

  async login(request: LoginRequest): Promise<AuthTokens & { user: any }> {
    const { email, password, rememberMe = false, ipAddress, userAgent } = request

    // Find user
    const user = await (prisma as any).user.findUnique({ where: { email } })
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Check account status
    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / (1000 * 60))
      throw new Error(`Account locked. Try again in ${remainingMinutes} minutes`)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      await this.handleFailedLogin(user.id, ipAddress)
      throw new Error('Invalid credentials')
    }

    // Reset login attempts on successful login
    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: new Date()
      }
    })

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.role, rememberMe)

    // Create session
    await this.createSession(user.id, tokens.accessToken, ipAddress, userAgent, rememberMe)

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      }
    }
  }

  async logout(token: string): Promise<void> {
    await (prisma as any).session.deleteMany({
      where: { token }
    })
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any

      // Verify refresh token exists in database
      const storedToken = await (prisma as any).refreshToken.findUnique({
        where: { token: refreshToken }
      })

      if (!storedToken || storedToken.expiresAt < new Date() || !storedToken.isActive) {
        throw new Error('Invalid refresh token')
      }

      // Get user
      const user = await (prisma as any).user.findUnique({
        where: { id: payload.userId }
      })

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.role, false)

      // Update refresh token
      await (prisma as any).refreshToken.update({
        where: { id: storedToken.id },
        data: {
          token: tokens.refreshToken,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_DURATION_DAYS * 24 * 60 * 60 * 1000)
        }
      })

      // Update session
      await (prisma as any).session.updateMany({
        where: { userId: user.id, refreshTokenId: storedToken.id },
        data: { token: tokens.accessToken }
      })

      return tokens

    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any

      // Verify session exists and is active
      const session = await (prisma as any).session.findUnique({
        where: { token },
        include: { user: true }
      })

      if (!session || session.expiresAt < new Date()) {
        return null
      }

      // Check if user is still active
      if (!session.user.isActive) {
        return null
      }

      return {
        userId: payload.userId,
        role: payload.role,
        sessionId: session.id
      }

    } catch {
      return null
    }
  }

  // Password Management
  async initiatePasswordReset(email: string): Promise<void> {
    const user = await (prisma as any).user.findUnique({ where: { email } })
    if (!user) {
      // Don't reveal if email exists for security
      return
    }

    await this.generateOTP(user.id, email, OTPType.PASSWORD_RESET)
    // In real implementation, send email with reset link
  }

  async resetPassword(request: PasswordResetRequest): Promise<void> {
    const { email, resetToken, newPassword } = request

    if (!newPassword) {
      throw new Error('New password is required')
    }

    // Verify OTP
    const otp = await (prisma as any).oTP.findFirst({
      where: {
        identifier: email,
        type: OTPType.PASSWORD_RESET,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!otp || otp.code !== resetToken) {
      throw new Error('Invalid or expired reset token')
    }

    // Validate new password
    this.validatePasswordStrength(newPassword)

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await (prisma as any).user.update({
      where: { id: otp.userId },
      data: { password: hashedPassword }
    })

    // Mark OTP as used
    await (prisma as any).oTP.update({
      where: { id: otp.id },
      data: { used: true }
    })

    // Invalidate all sessions
    await (prisma as any).session.deleteMany({
      where: { userId: otp.userId }
    })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await (prisma as any).user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    this.validatePasswordStrength(newPassword)

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await (prisma as any).user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    // Invalidate all other sessions (keep current one)
    await (prisma as any).session.deleteMany({
      where: {
        userId,
        // Keep current session if we had the token, but we don't here
        // In real implementation, exclude current session
      }
    })
  }

  // OTP Management
  async generateOTP(userId: string, identifier: string, type: OTPType): Promise<string> {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Hash the OTP for storage
    const hashedOTP = await bcrypt.hash(otpCode, 10)

    // Set expiry (10 minutes for email verification, 30 minutes for password reset)
    const expiryMinutes = type === OTPType.EMAIL_VERIFICATION ? 10 : 30

    await (prisma as any).oTP.create({
      data: {
        userId,
        identifier,
        code: hashedOTP,
        type,
        expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000)
      }
    })

    return otpCode // Return plain OTP for sending via email/SMS
  }

  async verifyOTP(identifier: string, otpCode: string, type: OTPType): Promise<boolean> {
    const otp = await (prisma as any).oTP.findFirst({
      where: {
        identifier,
        type,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!otp || !otp.code) {
      return false
    }

    const isValidOTP = await bcrypt.compare(otpCode, otp.code)
    if (isValidOTP) {
      // Mark as used
      await (prisma as any).oTP.update({
        where: { id: otp.id },
        data: { used: true }
      })
      return true
    }

    return false
  }

  // Email Verification
  async verifyEmail(email: string, verificationCode: string): Promise<void> {
    const isValid = await this.verifyOTP(email, verificationCode, OTPType.EMAIL_VERIFICATION)
    if (!isValid) {
      throw new Error('Invalid or expired verification code')
    }

    // Find user and mark email as verified
    const otp = await (prisma as any).oTP.findFirst({
      where: {
        identifier: email,
        type: OTPType.EMAIL_VERIFICATION,
        used: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (otp) {
      await (prisma as any).user.update({
        where: { id: otp.userId },
        data: { emailVerified: true }
      })
    }
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await (prisma as any).user.findUnique({ where: { email } })
    if (!user) {
      throw new Error('User not found')
    }

    if (user.emailVerified) {
      throw new Error('Email already verified')
    }

    await this.generateOTP(user.id, email, OTPType.EMAIL_VERIFICATION)
  }

  // User Profile Management
  async getUserProfile(userId: string): Promise<any> {
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        profile: true
      }
    })

    return user
  }

  async updateUserProfile(userId: string, profile: UserProfile): Promise<any> {
    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: { profile },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        profile: true
      }
    })

    return updatedUser
  }

  // Account Management
  async suspendUser(userId: string, reason: string, adminId: string): Promise<void> {
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        isActive: false,
        accountStatus: AccountStatus.SUSPENDED,
        suspensionReason: reason,
        suspendedAt: new Date(),
        suspendedBy: adminId
      }
    })

    // Emit UserSuspended event using helper function
    const envelope = eventBus.createEventEnvelope<UserSuspendedEvent>('UserSuspended', {
      userId,
      reason
    })

    eventBus.publish(envelope)

    // Invalidate all sessions
    await (prisma as any).session.deleteMany({
      where: { userId }
    })
  }

  async reactivateUser(userId: string): Promise<void> {
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        isActive: true,
        accountStatus: AccountStatus.ACTIVE,
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null
      }
    })
  }

  async deactivateUser(userId: string): Promise<void> {
    await (prisma as any).user.update({
      where: { id: userId },
      data: {
        isActive: false,
        accountStatus: AccountStatus.DEACTIVATED,
        deactivatedAt: new Date()
      }
    })

    // Invalidate all sessions
    await (prisma as any).session.deleteMany({
      where: { userId }
    })
  }

  // Session Management
  async getUserSessions(userId: string): Promise<any[]> {
    return await (prisma as any).session.findMany({
      where: { userId },
      select: {
        id: true,
        token: false, // Don't expose tokens
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await (prisma as any).session.deleteMany({
      where: {
        id: sessionId,
        userId // Ensure user can only revoke their own sessions
      }
    })
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await (prisma as any).session.deleteMany({
      where: { userId }
    })
  }

  // Security Methods
  private async handleFailedLogin(userId: string, ipAddress?: string): Promise<void> {
    const user = await (prisma as any).user.findUnique({ where: { id: userId } })

    if (!user) return

    const newAttempts = (user.loginAttempts || 0) + 1

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Lock account
      await (prisma as any).user.update({
        where: { id: userId },
        data: {
          loginAttempts: newAttempts,
          accountLockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
          accountStatus: AccountStatus.LOCKED
        }
      })
    } else {
      await (prisma as any).user.update({
        where: { id: userId },
        data: { loginAttempts: newAttempts }
      })
    }
  }

  private async generateTokens(userId: string, role: UserRole, rememberMe: boolean): Promise<AuthTokens> {
    const accessTokenExpiry = rememberMe ? '7d' : `${SESSION_DURATION_HOURS}h`
    const refreshTokenExpiry = `${REFRESH_TOKEN_DURATION_DAYS}d`

    const accessToken = jwt.sign(
      { userId, role, type: 'access' },
      JWT_SECRET,
      { expiresIn: accessTokenExpiry }
    )

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: refreshTokenExpiry }
    )

    // Store refresh token
    await (prisma as any).refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_DURATION_DAYS * 24 * 60 * 60 * 1000)
      }
    })

    return {
      accessToken,
      refreshToken,
      expiresIn: rememberMe ? 7 * 24 * 60 * 60 : SESSION_DURATION_HOURS * 60 * 60,
      tokenType: 'Bearer'
    }
  }

  private async createSession(
    userId: string,
    accessToken: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false
  ): Promise<void> {
    const expiresAt = rememberMe
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000) // 8 hours

    await (prisma as any).session.create({
      data: {
        userId,
        token: accessToken,
        expiresAt,
        ipAddress,
        userAgent
      }
    })
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    }
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      await (prisma as any).user.count()
      return {
        status: 'healthy',
        service: 'auth-service'
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'auth-service',
        error: (error as Error).message
      }
    }
  }
}
