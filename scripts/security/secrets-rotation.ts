#!/usr/bin/env tsx

/**
 * Secrets Rotation Automation
 * Automated 90-day secrets rotation for enterprise security compliance
 * Handles database passwords, API keys, JWT secrets, and encryption keys
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SecretRotationConfig {
  service: string;
  secretType: 'database' | 'api_key' | 'jwt_secret' | 'encryption_key';
  rotationSchedule: number; // days
  lastRotated: Date;
  nextRotation: Date;
  status: 'active' | 'pending' | 'failed';
}

interface RotationResult {
  success: boolean;
  service: string;
  secretType: string;
  oldSecret?: string;
  newSecret?: string;
  error?: string;
  timestamp: Date;
}

class SecretsRotationManager {
  private rotationHistory: RotationResult[] = [];
  private configPath = path.join(process.cwd(), 'config', 'secrets-rotation.json');

  /**
   * Generate cryptographically secure random secret
   */
  private generateSecureSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure API key
   */
  private generateApiKey(): string {
    const prefix = 'sk_live_'; // or sk_test_ for staging
    const key = crypto.randomBytes(32).toString('hex');
    return `${prefix}${key}`;
  }

  /**
   * Generate JWT secret (HMAC SHA-256 compatible)
   */
  private generateJwtSecret(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Generate encryption key for AES-256
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Load rotation configuration
   */
  private async loadRotationConfig(): Promise<SecretRotationConfig[]> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return this.initializeDefaultConfig();
      }

      const configData = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load rotation config:', error);
      return this.initializeDefaultConfig();
    }
  }

  /**
   * Initialize default rotation configuration
   */
  private initializeDefaultConfig(): SecretRotationConfig[] {
    const now = new Date();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    return [
      {
        service: 'auth-service',
        secretType: 'jwt_secret',
        rotationSchedule: 90,
        lastRotated: new Date(now.getTime() - ninetyDays + (30 * 24 * 60 * 60 * 1000)), // 60 days ago
        nextRotation: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from now
        status: 'active'
      },
      {
        service: 'payment-service',
        secretType: 'api_key',
        rotationSchedule: 90,
        lastRotated: new Date(now.getTime() - ninetyDays + (45 * 24 * 60 * 60 * 1000)), // 45 days ago
        nextRotation: new Date(now.getTime() + (45 * 24 * 60 * 60 * 1000)), // 45 days from now
        status: 'active'
      },
      {
        service: 'database',
        secretType: 'database',
        rotationSchedule: 90,
        lastRotated: new Date(now.getTime() - ninetyDays + (60 * 24 * 60 * 60 * 1000)), // 30 days ago
        nextRotation: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from now
        status: 'active'
      },
      {
        service: 'encryption-service',
        secretType: 'encryption_key',
        rotationSchedule: 90,
        lastRotated: new Date(now.getTime() - ninetyDays + (75 * 24 * 60 * 60 * 1000)), // 15 days ago
        nextRotation: new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000)), // 15 days from now
        status: 'active'
      }
    ];
  }

  /**
   * Save rotation configuration
   */
  private async saveRotationConfig(config: SecretRotationConfig[]): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('✅ Rotation configuration saved');
    } catch (error) {
      console.error('Failed to save rotation config:', error);
    }
  }

  /**
   * Rotate database password
   */
  private async rotateDatabasePassword(service: string): Promise<RotationResult> {
    const timestamp = new Date();

    try {
      // Generate new secure password
      const newPassword = this.generateSecureSecret(32);

      // In production, this would:
      // 1. Update database user password
      // 2. Update application configuration
      // 3. Restart affected services
      // 4. Validate connectivity
      // 5. Rollback on failure

      console.log(`🔄 Rotating database password for ${service}`);
      console.log(`📝 New password generated (length: ${newPassword.length})`);

      // Simulate database password update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update environment variables or configuration
      this.updateServiceConfig(service, 'DATABASE_PASSWORD', newPassword);

      console.log(`✅ Database password rotated for ${service}`);

      return {
        success: true,
        service,
        secretType: 'database',
        newSecret: newPassword.substring(0, 8) + '...', // Don't log full secret
        timestamp
      };

    } catch (error) {
      console.error(`❌ Failed to rotate database password for ${service}:`, error);

      return {
        success: false,
        service,
        secretType: 'database',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }

  /**
   * Rotate API key
   */
  private async rotateApiKey(service: string): Promise<RotationResult> {
    const timestamp = new Date();

    try {
      const newApiKey = this.generateApiKey();

      console.log(`🔄 Rotating API key for ${service}`);

      // Update API key in configuration
      this.updateServiceConfig(service, 'API_KEY', newApiKey);

      // In production, update external services that use this key
      await this.updateExternalServices(service, newApiKey);

      console.log(`✅ API key rotated for ${service}`);

      return {
        success: true,
        service,
        secretType: 'api_key',
        newSecret: newApiKey.substring(0, 12) + '...',
        timestamp
      };

    } catch (error) {
      console.error(`❌ Failed to rotate API key for ${service}:`, error);

      return {
        success: false,
        service,
        secretType: 'api_key',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }

  /**
   * Rotate JWT secret
   */
  private async rotateJwtSecret(service: string): Promise<RotationResult> {
    const timestamp = new Date();

    try {
      const newJwtSecret = this.generateJwtSecret();

      console.log(`🔄 Rotating JWT secret for ${service}`);

      // Update JWT secret in configuration
      this.updateServiceConfig(service, 'JWT_SECRET', newJwtSecret);

      // Graceful token rotation - allow old tokens for a period
      await this.handleGracefulTokenRotation(service);

      console.log(`✅ JWT secret rotated for ${service}`);

      return {
        success: true,
        service,
        secretType: 'jwt_secret',
        newSecret: newJwtSecret.substring(0, 12) + '...',
        timestamp
      };

    } catch (error) {
      console.error(`❌ Failed to rotate JWT secret for ${service}:`, error);

      return {
        success: false,
        service,
        secretType: 'jwt_secret',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }

  /**
   * Rotate encryption key
   */
  private async rotateEncryptionKey(service: string): Promise<RotationResult> {
    const timestamp = new Date();

    try {
      const newEncryptionKey = this.generateEncryptionKey();

      console.log(`🔄 Rotating encryption key for ${service}`);

      // Update encryption key in configuration
      this.updateServiceConfig(service, 'ENCRYPTION_KEY', newEncryptionKey);

      // Handle encrypted data re-encryption if necessary
      await this.handleEncryptedDataRotation(service, newEncryptionKey);

      console.log(`✅ Encryption key rotated for ${service}`);

      return {
        success: true,
        service,
        secretType: 'encryption_key',
        newSecret: newEncryptionKey.substring(0, 12) + '...',
        timestamp
      };

    } catch (error) {
      console.error(`❌ Failed to rotate encryption key for ${service}:`, error);

      return {
        success: false,
        service,
        secretType: 'encryption_key',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };
    }
  }

  /**
   * Update service configuration
   */
  private updateServiceConfig(service: string, key: string, value: string): void {
    // In production, this would update:
    // - Kubernetes secrets
    // - AWS Secrets Manager
    // - HashiCorp Vault
    // - Environment variables
    // - Configuration files

    console.log(`📝 Updated ${key} for ${service}`);
  }

  /**
   * Update external services that depend on rotated secrets
   */
  private async updateExternalServices(service: string, newSecret: string): Promise<void> {
    // Update external APIs, webhooks, integrations
    console.log(`🔗 Updating external services for ${service}`);

    // Simulate API calls to update external services
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Handle graceful JWT token rotation
   */
  private async handleGracefulTokenRotation(service: string): Promise<void> {
    // Allow old tokens for a grace period (e.g., 24 hours)
    // Update token validation logic to accept both old and new secrets
    console.log(`⏰ Graceful token rotation enabled for ${service}`);

    // In production, implement dual-secret validation
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Handle encrypted data rotation
   */
  private async handleEncryptedDataRotation(service: string, newKey: string): Promise<void> {
    // For services with encrypted data, re-encrypt with new key
    console.log(`🔐 Handling encrypted data rotation for ${service}`);

    // In production, this would:
    // - Decrypt data with old key
    // - Re-encrypt with new key
    // - Update database records
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  /**
   * Rotate secrets for a specific service
   */
  private async rotateSecret(config: SecretRotationConfig): Promise<RotationResult> {
    switch (config.secretType) {
      case 'database':
        return await this.rotateDatabasePassword(config.service);
      case 'api_key':
        return await this.rotateApiKey(config.service);
      case 'jwt_secret':
        return await this.rotateJwtSecret(config.service);
      case 'encryption_key':
        return await this.rotateEncryptionKey(config.service);
      default:
        return {
          success: false,
          service: config.service,
          secretType: config.secretType,
          error: `Unsupported secret type: ${config.secretType}`,
          timestamp: new Date()
        };
    }
  }

  /**
   * Check and rotate secrets that are due for rotation
   */
  async checkAndRotateSecrets(): Promise<void> {
    console.log('🔐 Starting secrets rotation check...');

    const configs = await this.loadRotationConfig();
    const now = new Date();
    let rotatedCount = 0;

    for (const config of configs) {
      if (config.nextRotation <= now && config.status === 'active') {
        console.log(`🎯 Rotating ${config.secretType} for ${config.service}`);

        const result = await this.rotateSecret(config);

        if (result.success) {
          // Update configuration
          config.lastRotated = now;
          config.nextRotation = new Date(now.getTime() + (config.rotationSchedule * 24 * 60 * 60 * 1000));
          config.status = 'active';
          rotatedCount++;

          console.log(`✅ Successfully rotated ${config.secretType} for ${config.service}`);
        } else {
          config.status = 'failed';
          console.error(`❌ Failed to rotate ${config.secretType} for ${config.service}: ${result.error}`);
        }

        this.rotationHistory.push(result);
      }
    }

    // Save updated configuration
    await this.saveRotationConfig(configs);

    // Log rotation summary
    await this.logRotationSummary(rotatedCount);

    console.log(`🎉 Secrets rotation completed. Rotated ${rotatedCount} secrets.`);
  }

  /**
   * Log rotation summary
   */
  private async logRotationSummary(rotatedCount: number): Promise<void> {
    const summary = {
      timestamp: new Date(),
      totalSecretsRotated: rotatedCount,
      successCount: this.rotationHistory.filter(r => r.success).length,
      failureCount: this.rotationHistory.filter(r => !r.success).length,
      details: this.rotationHistory
    };

    // In production, send to monitoring system
    console.log('📊 Rotation Summary:', JSON.stringify(summary, null, 2));
  }

  /**
   * Get rotation status
   */
  async getRotationStatus(): Promise<SecretRotationConfig[]> {
    return await this.loadRotationConfig();
  }

  /**
   * Force rotate a specific secret
   */
  async forceRotateSecret(service: string, secretType: string): Promise<RotationResult> {
    const configs = await this.loadRotationConfig();
    const config = configs.find(c => c.service === service && c.secretType === secretType);

    if (!config) {
      return {
        success: false,
        service,
        secretType,
        error: 'Secret configuration not found',
        timestamp: new Date()
      };
    }

    console.log(`🔄 Force rotating ${secretType} for ${service}`);
    return await this.rotateSecret(config);
  }

  /**
   * Validate secret rotation health
   */
  async validateRotationHealth(): Promise<{
    totalSecrets: number;
    dueForRotation: number;
    failedRotations: number;
    nextRotationDate: Date | null;
  }> {
    const configs = await this.loadRotationConfig();
    const now = new Date();

    const dueForRotation = configs.filter(c => c.nextRotation <= now).length;
    const failedRotations = configs.filter(c => c.status === 'failed').length;
    const nextRotationDate = configs
      .filter(c => c.status === 'active')
      .map(c => c.nextRotation)
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;

    return {
      totalSecrets: configs.length,
      dueForRotation,
      failedRotations,
      nextRotationDate
    };
  }
}

// CLI execution
async function main() {
  const manager = new SecretsRotationManager();

  const command = process.argv[2];

  switch (command) {
    case 'rotate':
      await manager.checkAndRotateSecrets();
      break;

    case 'status':
      const status = await manager.getRotationStatus();
      console.log('🔐 Secrets Rotation Status:');
      console.table(status.map(s => ({
        Service: s.service,
        Type: s.secretType,
        'Last Rotated': s.lastRotated.toISOString().split('T')[0],
        'Next Rotation': s.nextRotation.toISOString().split('T')[0],
        Status: s.status
      })));
      break;

    case 'force':
      const service = process.argv[3];
      const secretType = process.argv[4];
      if (!service || !secretType) {
        console.error('Usage: tsx secrets-rotation.ts force <service> <secret-type>');
        process.exit(1);
      }
      const result = await manager.forceRotateSecret(service, secretType);
      console.log(result.success ? '✅ Force rotation successful' : '❌ Force rotation failed:', result.error);
      break;

    case 'health':
      const health = await manager.validateRotationHealth();
      console.log('🔍 Secrets Rotation Health:');
      console.log(`Total Secrets: ${health.totalSecrets}`);
      console.log(`Due for Rotation: ${health.dueForRotation}`);
      console.log(`Failed Rotations: ${health.failedRotations}`);
      console.log(`Next Rotation: ${health.nextRotationDate?.toISOString().split('T')[0] || 'None scheduled'}`);
      break;

    default:
      console.log('🔐 Secrets Rotation Automation');
      console.log('');
      console.log('Usage:');
      console.log('  tsx secrets-rotation.ts rotate    # Check and rotate due secrets');
      console.log('  tsx secrets-rotation.ts status    # Show rotation status');
      console.log('  tsx secrets-rotation.ts force <service> <type>  # Force rotate specific secret');
      console.log('  tsx secrets-rotation.ts health    # Show rotation health');
      break;
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(console.error);
}
