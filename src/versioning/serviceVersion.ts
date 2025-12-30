// Service Versioning System
// Implements semantic versioning for microservices

import { readFileSync } from 'fs'
import { join } from 'path'

export interface ServiceVersion {
  name: string
  version: string
  major: number
  minor: number
  patch: number
  prerelease?: string
  build?: string
  environment: 'development' | 'staging' | 'production'
  buildTime: string
  gitCommit?: string
  gitBranch?: string
}

export class ServiceVersionManager {
  private static instance: ServiceVersionManager
  private version: ServiceVersion

  private constructor() {
    this.version = this.loadServiceVersion()
  }

  static getInstance(): ServiceVersionManager {
    if (!ServiceVersionManager.instance) {
      ServiceVersionManager.instance = new ServiceVersionManager()
    }
    return ServiceVersionManager.instance
  }

  private loadServiceVersion(): ServiceVersion {
    // Load from package.json
    const packageJsonPath = join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

    // Parse semantic version
    const versionString = packageJson.version || '1.0.0'
    const versionParts = this.parseVersionString(versionString)

    // Determine environment
    const environment = this.getEnvironment()

    // Get git information
    const gitInfo = this.getGitInfo()

    return {
      name: packageJson.name || 'unknown-service',
      version: versionString,
      major: versionParts.major,
      minor: versionParts.minor,
      patch: versionParts.patch,
      prerelease: versionParts.prerelease,
      build: versionParts.build,
      environment,
      buildTime: new Date().toISOString(),
      ...gitInfo
    }
  }

  private parseVersionString(version: string): {
    major: number
    minor: number
    patch: number
    prerelease?: string
    build?: string
  } {
    // Parse semantic version: MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
    const match = version.match(semverRegex)

    if (!match) {
      throw new Error(`Invalid semantic version: ${version}`)
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5]
    }
  }

  private getEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.NODE_ENV || process.env.ENVIRONMENT || 'development'

    switch (env.toLowerCase()) {
      case 'prod':
      case 'production':
        return 'production'
      case 'staging':
      case 'stage':
        return 'staging'
      default:
        return 'development'
    }
  }

  private getGitInfo(): { gitCommit?: string; gitBranch?: string } {
    try {
      // In a real implementation, you'd use child_process to run git commands
      // For now, return mock data
      return {
        gitCommit: process.env.GIT_COMMIT || 'unknown',
        gitBranch: process.env.GIT_BRANCH || 'main'
      }
    } catch (error) {
      return {}
    }
  }

  // Version comparison methods
  isCompatible(otherVersion: ServiceVersion): boolean {
    return this.version.major === otherVersion.major &&
           this.version.minor >= otherVersion.minor
  }

  isBreakingChange(otherVersion: ServiceVersion): boolean {
    return this.version.major > otherVersion.major
  }

  isNewerThan(otherVersion: ServiceVersion): boolean {
    if (this.version.major !== otherVersion.major) {
      return this.version.major > otherVersion.major
    }
    if (this.version.minor !== otherVersion.minor) {
      return this.version.minor > otherVersion.minor
    }
    return this.version.patch > otherVersion.patch
  }

  // Get version information
  getVersion(): ServiceVersion {
    return { ...this.version }
  }

  getVersionString(): string {
    return this.version.version
  }

  getServiceName(): string {
    return this.version.name
  }

  getFullServiceIdentifier(): string {
    return `${this.version.name}@${this.version.version}`
  }

  // Version validation
  static validateVersionString(version: string): boolean {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
    return semverRegex.test(version)
  }

  // Version bumping utilities
  static bumpMajor(version: string): string {
    const parts = this.parseVersionString(version)
    return `${parts.major + 1}.0.0`
  }

  static bumpMinor(version: string): string {
    const parts = this.parseVersionString(version)
    return `${parts.major}.${parts.minor + 1}.0`
  }

  static bumpPatch(version: string): string {
    const parts = this.parseVersionString(version)
    return `${parts.major}.${parts.minor}.${parts.patch + 1}`
  }

  private static parseVersionString(version: string): {
    major: number
    minor: number
    patch: number
    prerelease?: string
    build?: string
  } {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
    const match = version.match(semverRegex)

    if (!match) {
      throw new Error(`Invalid semantic version: ${version}`)
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5]
    }
  }
}

// Global service version instance
export const serviceVersion = ServiceVersionManager.getInstance()

// Express middleware for service version headers
export function serviceVersionMiddleware(req: any, res: any, next: any) {
  const version = serviceVersion.getVersion()

  // Add version headers to all responses
  res.setHeader('X-Service-Name', version.name)
  res.setHeader('X-Service-Version', version.version)
  res.setHeader('X-API-Version', `v${version.major}`)
  res.setHeader('X-Build-Time', version.buildTime)

  if (version.gitCommit) {
    res.setHeader('X-Git-Commit', version.gitCommit)
  }

  next()
}

// Health check endpoint with version info
export function getServiceVersionHealth(): any {
  const version = serviceVersion.getVersion()

  return {
    service: version.name,
    version: version.version,
    environment: version.environment,
    status: 'healthy',
    buildTime: version.buildTime,
    gitCommit: version.gitCommit,
    apiVersion: `v${version.major}`,
    compatibility: {
      breaking: version.major,
      features: `${version.major}.${version.minor}`,
      patches: `${version.major}.${version.minor}.${version.patch}`
    }
  }
}
