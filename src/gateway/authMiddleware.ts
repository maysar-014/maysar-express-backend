// API Gateway Authentication Middleware
// Implements JWT validation, role-based access, and API key authentication

import jwt from 'jsonwebtoken'
import { AuthService } from '../modules/auth/auth'
import { AdminService } from '../modules/admin/admin'

export interface AuthenticatedRequest extends Request {
  user?: any
  admin?: any
  apiKey?: string
  isAuthenticated: boolean
  permissions: string[]
}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export class AuthMiddleware {
  private authService: AuthService
  private adminService: AdminService
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(authService: AuthService, adminService: AdminService) {
    this.authService = authService
    this.adminService = adminService
  }

  // JWT Authentication Middleware
  authenticateJWT = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access token required' })
      }

      const token = authHeader.substring(7) // Remove 'Bearer ' prefix

      // Validate JWT token
      const payload = await this.authService.validateToken(token)
      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }

      // Get user details
      const user = await this.authService.getUserProfile(payload.userId)
      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }

      // Attach user to request
      req.user = user
      req.isAuthenticated = true
      req.permissions = this.getUserPermissions(user.role)

      next()
    } catch (error) {
      console.error('JWT authentication error:', error)
      res.status(401).json({ error: 'Authentication failed' })
    }
  }

  // Admin JWT Authentication Middleware
  authenticateAdminJWT = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin access token required' })
      }

      const token = authHeader.substring(7)

      // Validate admin JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret') as any

      if (!decoded.adminId) {
        return res.status(401).json({ error: 'Invalid admin token' })
      }

      // Get admin details
      const admin = await this.adminService.getAdminById(decoded.adminId)
      if (!admin) {
        return res.status(401).json({ error: 'Admin not found' })
      }

      // Attach admin to request
      req.admin = admin
      req.isAuthenticated = true
      req.permissions = this.getAdminPermissions(admin.role)

      next()
    } catch (error) {
      console.error('Admin JWT authentication error:', error)
      res.status(401).json({ error: 'Admin authentication failed' })
    }
  }

  // API Key Authentication Middleware
  authenticateAPIKey = async (req: any, res: any, next: any) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(401).json({ error: 'API key required' })
      }

      // Validate API key (in production, check against database/cache)
      const isValid = await this.validateAPIKey(apiKey)
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid API key' })
      }

      // Attach API key info to request
      req.apiKey = apiKey
      req.isAuthenticated = true
      req.permissions = ['api_access'] // API key permissions

      next()
    } catch (error) {
      console.error('API key authentication error:', error)
      res.status(401).json({ error: 'API key authentication failed' })
    }
  }

  // Combined Authentication (JWT or API Key)
  authenticateAny = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    const apiKey = req.headers['x-api-key'] || req.query.api_key

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Try JWT authentication
      return this.authenticateJWT(req, res, next)
    } else if (apiKey) {
      // Try API key authentication
      return this.authenticateAPIKey(req, res, next)
    } else {
      return res.status(401).json({ error: 'Authentication required (Bearer token or API key)' })
    }
  }

  // Role-based Authorization Middleware
  authorize = (requiredPermissions: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.isAuthenticated) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const hasPermission = requiredPermissions.some(permission =>
        req.permissions.includes(permission)
      )

      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      next()
    }
  }

  // Rate Limiting Middleware
  rateLimit = (config: RateLimitConfig) => {
    return (req: any, res: any, next: any) => {
      const key = this.getRateLimitKey(req)
      const now = Date.now()

      // Get current rate limit data
      let rateLimitData = this.rateLimits.get(key)

      if (!rateLimitData || now > rateLimitData.resetTime) {
        // Reset or initialize rate limit data
        rateLimitData = {
          count: 0,
          resetTime: now + config.windowMs
        }
        this.rateLimits.set(key, rateLimitData)
      }

      // Check if limit exceeded
      if (rateLimitData.count >= config.maxRequests) {
        const resetIn = Math.ceil((rateLimitData.resetTime - now) / 1000)
        res.set('X-RateLimit-Reset', rateLimitData.resetTime.toString())
        res.set('X-RateLimit-Remaining', '0')
        res.set('X-RateLimit-Limit', config.maxRequests.toString())
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: resetIn
        })
      }

      // Increment counter
      rateLimitData.count++

      // Set headers
      const remaining = Math.max(0, config.maxRequests - rateLimitData.count)
      res.set('X-RateLimit-Remaining', remaining.toString())
      res.set('X-RateLimit-Reset', rateLimitData.resetTime.toString())
      res.set('X-RateLimit-Limit', config.maxRequests.toString())

      next()
    }
  }

  // Request Logging Middleware
  requestLogger = (req: any, res: any, next: any) => {
    const start = Date.now()

    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`)

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - start
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`)
    })

    next()
  }

  // Security Headers Middleware
  securityHeaders = (req: any, res: any, next: any) => {
    // Prevent clickjacking
    res.set('X-Frame-Options', 'DENY')

    // Prevent MIME type sniffing
    res.set('X-Content-Type-Options', 'nosniff')

    // Enable XSS protection
    res.set('X-XSS-Protection', '1; mode=block')

    // Referrer policy
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Content Security Policy (basic)
    res.set('Content-Security-Policy', "default-src 'self'")

    // HSTS (HTTP Strict Transport Security) - only in production
    if (process.env.NODE_ENV === 'production') {
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    next()
  }

  // CORS Middleware
  corsHandler = (req: any, res: any, next: any) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']

    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
    }

    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
    res.set('Access-Control-Allow-Credentials', true)

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }

    next()
  }

  // API Versioning Middleware
  apiVersion = (req: any, res: any, next: any) => {
    // Extract version from URL path (e.g., /v1/users, /v2/orders)
    const versionMatch = req.path.match(/^\/v(\d+)/)
    if (versionMatch) {
      req.apiVersion = versionMatch[1]
      // Remove version from path for route handling
      req.url = req.path.replace(/^\/v\d+/, '') || '/'
    } else {
      req.apiVersion = '1' // Default to v1
    }

    // Set version header in response
    res.set('X-API-Version', req.apiVersion)

    next()
  }

  // Health Check Middleware (bypasses auth)
  healthCheck = (req: any, res: any, next: any) => {
    if (req.path === '/health' || req.path === '/ping') {
      return next()
    }
    // Continue with normal middleware chain
    next()
  }

  // Private Methods
  private getUserPermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      buyer: ['read_orders', 'create_orders', 'update_profile'],
      seller: ['read_orders', 'create_products', 'manage_inventory', 'update_profile'],
      admin: ['all'] // Special case handled separately
    }

    return rolePermissions[role] || []
  }

  private getAdminPermissions(role: string): string[] {
    const adminPermissions: Record<string, string[]> = {
      support: ['view_orders', 'cancel_orders'],
      ops: ['view_orders', 'cancel_orders', 'suspend_users'],
      finance: ['view_payments', 'refund_payments', 'view_wallet'],
      compliance: ['view_audit_logs', 'freeze_accounts', 'override_kyc'],
      super: ['all']
    }

    return adminPermissions[role] || []
  }

  private async validateAPIKey(apiKey: string): Promise<boolean> {
    // In production, validate against database/cache
    // For now, accept any non-empty API key
    return !!(apiKey && apiKey.length > 10)
  }

  private getRateLimitKey(req: any): string {
    // Use IP address as default key, but allow API key override
    const identifier = req.apiKey || req.user?.id || req.admin?.id || req.ip
    return `${req.method}:${req.path}:${identifier}`
  }

  // Clean up expired rate limit entries periodically
  private cleanupRateLimits(): void {
    const now = Date.now()
    for (const [key, data] of this.rateLimits.entries()) {
      if (now > data.resetTime) {
        this.rateLimits.delete(key)
      }
    }
  }

  // Initialize cleanup interval
  init(): void {
    // Clean up rate limits every 5 minutes
    setInterval(() => this.cleanupRateLimits(), 5 * 60 * 1000)
  }
}
