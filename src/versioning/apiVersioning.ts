// API Gateway Versioning System
// Implements URL-based API versioning (/v1, /v2)

import { Request, Response, NextFunction } from 'express'

export type APIVersion = 'v1' | 'v2' | 'v3'
export type VersionStatus = 'active' | 'deprecated' | 'sunset'

export interface APIVersionInfo {
  version: APIVersion
  status: VersionStatus
  releaseDate: string
  sunsetDate?: string
  deprecatedDate?: string
  description: string
  changes: string[]
}

export class APIVersionManager {
  private static instance: APIVersionManager
  private versions: Map<APIVersion, APIVersionInfo> = new Map()

  private constructor() {
    this.initializeVersions()
  }

  static getInstance(): APIVersionManager {
    if (!APIVersionManager.instance) {
      APIVersionManager.instance = new APIVersionManager()
    }
    return APIVersionManager.instance
  }

  private initializeVersions(): void {
    // Define available API versions
    this.versions.set('v1', {
      version: 'v1',
      status: 'active',
      releaseDate: '2024-01-01',
      description: 'Initial API version',
      changes: [
        'Basic CRUD operations',
        'Standard authentication',
        'Simple pagination'
      ]
    })

    this.versions.set('v2', {
      version: 'v2',
      status: 'active',
      releaseDate: '2024-06-01',
      description: 'Enhanced API with advanced features',
      changes: [
        'Advanced filtering and sorting',
        'Bulk operations',
        'Real-time notifications',
        'Enhanced security features'
      ]
    })

    this.versions.set('v3', {
      version: 'v3',
      status: 'deprecated',
      releaseDate: '2025-01-01',
      deprecatedDate: '2025-12-01',
      sunsetDate: '2026-01-01',
      description: 'Latest API version with breaking changes',
      changes: [
        'GraphQL support',
        'Event-driven architecture',
        'Advanced caching',
        'Microservice integration'
      ]
    })
  }

  // Get version information
  getVersionInfo(version: APIVersion): APIVersionInfo | undefined {
    return this.versions.get(version)
  }

  getActiveVersions(): APIVersionInfo[] {
    return Array.from(this.versions.values()).filter(v => v.status === 'active')
  }

  getDeprecatedVersions(): APIVersionInfo[] {
    return Array.from(this.versions.values()).filter(v => v.status === 'deprecated')
  }

  getAllVersions(): APIVersionInfo[] {
    return Array.from(this.versions.values())
  }

  // Version validation
  isValidVersion(version: string): version is APIVersion {
    return this.versions.has(version as APIVersion)
  }

  isActiveVersion(version: APIVersion): boolean {
    const info = this.versions.get(version)
    return info?.status === 'active'
  }

  isDeprecatedVersion(version: APIVersion): boolean {
    const info = this.versions.get(version)
    return info?.status === 'deprecated'
  }

  // Version comparison
  getLatestVersion(): APIVersion {
    const activeVersions = this.getActiveVersions()
    return activeVersions[activeVersions.length - 1]?.version || 'v1'
  }

  // Version routing
  extractVersionFromPath(path: string): APIVersion | null {
    const versionMatch = path.match(/^\/(v\d+)\//)
    if (versionMatch && this.isValidVersion(versionMatch[1])) {
      return versionMatch[1] as APIVersion
    }
    return null
  }

  // Version compatibility
  isVersionCompatible(requestedVersion: APIVersion, supportedVersion: APIVersion): boolean {
    // Simple compatibility: same major version
    return requestedVersion === supportedVersion
  }
}

// Express middleware for API versioning
export function apiVersioningMiddleware(
  defaultVersion: APIVersion = 'v1',
  strictVersioning: boolean = false
) {
  const versionManager = APIVersionManager.getInstance()

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract version from URL path
    const pathVersion = versionManager.extractVersionFromPath(req.path)

    // Extract version from headers (fallback)
    const headerVersion = req.headers['x-api-version'] as APIVersion

    // Determine version to use
    const requestedVersion = pathVersion || headerVersion || defaultVersion

    // Validate version
    if (!versionManager.isValidVersion(requestedVersion)) {
      return res.status(400).json({
        error: 'Invalid API version',
        message: `Version '${requestedVersion}' is not supported`,
        supportedVersions: versionManager.getAllVersions().map(v => v.version)
      })
    }

    // Check if version is deprecated
    if (versionManager.isDeprecatedVersion(requestedVersion)) {
      const versionInfo = versionManager.getVersionInfo(requestedVersion)
      res.setHeader('X-API-Deprecated', 'true')
      res.setHeader('X-API-Sunset-Date', versionInfo?.sunsetDate || '')

      // Log deprecation warning
      console.warn(`Deprecated API version used: ${requestedVersion} - ${req.path}`)
    }

    // Attach version info to request
    (req as any).apiVersion = requestedVersion
    (req as any).apiVersionInfo = versionManager.getVersionInfo(requestedVersion as APIVersion)

    // Add version headers to response
    res.setHeader('X-API-Version', requestedVersion)
    res.setHeader('X-API-Status', versionManager.getVersionInfo(requestedVersion as APIVersion)?.status || 'unknown')

    next()
  }
}

// Version-specific route decorator
export function versionedRoute(version: APIVersion) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestVersion = (req as any).apiVersion

    if (requestVersion !== version) {
      return next() // Skip this route handler
    }

    next()
  }
}

// Version-aware error handler
export function versionedErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiVersion = (req as any).apiVersion || 'v1'

  // Version-specific error formatting
  let errorResponse: any

  switch (apiVersion) {
    case 'v1':
      errorResponse = {
        error: true,
        message: error.message,
        code: error.code || 'INTERNAL_ERROR'
      }
      break

    case 'v2':
    case 'v3':
      errorResponse = {
        error: {
          type: error.name || 'InternalError',
          message: error.message,
          code: error.code || 'INTERNAL_ERROR',
          details: error.details || null
        },
        requestId: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString(),
        apiVersion: apiVersion
      }
      break

    default:
      errorResponse = {
        error: 'Unknown API version',
        message: error.message
      }
  }

  const statusCode = error.statusCode || error.status || 500
  res.status(statusCode).json(errorResponse)
}

// API documentation endpoint
export function getAPIVersionDocumentation() {
  const versionManager = APIVersionManager.getInstance()

  return {
    versions: versionManager.getAllVersions(),
    current: versionManager.getLatestVersion(),
    deprecated: versionManager.getDeprecatedVersions().map(v => v.version),
    migrationGuide: {
      fromV1ToV2: '/docs/api-migration-v1-v2',
      fromV2ToV3: '/docs/api-migration-v2-v3'
    },
    versioningStrategy: {
      urlBased: '/v1/users, /v2/users',
      headerBased: 'X-API-Version: v1',
      default: 'v1'
    }
  }
}

// Version compatibility checker middleware
export function versionCompatibilityMiddleware(requiredVersion: APIVersion) {
  const versionManager = APIVersionManager.getInstance()

  return (req: Request, res: Response, next: NextFunction) => {
    const requestVersion = (req as any).apiVersion

    if (!versionManager.isVersionCompatible(requestVersion, requiredVersion)) {
      return res.status(400).json({
        error: 'API Version Not Compatible',
        message: `This endpoint requires API version ${requiredVersion}`,
        requestedVersion: requestVersion,
        requiredVersion: requiredVersion
      })
    }

    next()
  }
}

// Global API version manager instance
export const apiVersionManager = APIVersionManager.getInstance()
