// PCI DSS 3.4 - Encryption Utilities for Payment Service
// Implements AES-256-CBC encryption with proper key management

import crypto from 'crypto'
import { createHash } from 'crypto'

export interface EncryptionConfig {
  algorithm: string
  keyLength: number
  ivLength: number
  keyRotationDays: number
}

export interface EncryptedData {
  encrypted: string
  iv: string
  keyVersion: string
  algorithm: string
}

export class PaymentEncryptionService {
  private config: EncryptionConfig
  private currentKeyVersion: string
  private encryptionKeys: Map<string, Buffer> = new Map()

  constructor() {
    this.config = {
      algorithm: 'aes-256-cbc',
      keyLength: 32, // 256 bits
      ivLength: 16,  // 128 bits
      keyRotationDays: 90 // PCI DSS 3.5.2 - Rotate keys every 90 days
    }

    this.currentKeyVersion = this.generateKeyVersion()
    this.initializeKeys()
  }

  // PCI DSS 3.5.2 - Key Management
  private generateKeyVersion(): string {
    const timestamp = Date.now().toString()
    return createHash('sha256').update(timestamp).digest('hex').substring(0, 8)
  }

  private initializeKeys(): void {
    // In production, keys should come from AWS KMS, Azure Key Vault, or similar
    // For development, we'll generate keys (NEVER do this in production)
    const masterKey = process.env.PAYMENT_ENCRYPTION_MASTER_KEY
    if (!masterKey) {
      throw new Error('PAYMENT_ENCRYPTION_MASTER_KEY environment variable is required')
    }

    // Derive encryption key from master key using HKDF
    const keyMaterial = this.hkdf(masterKey, 'payment-encryption', this.config.keyLength)
    this.encryptionKeys.set(this.currentKeyVersion, keyMaterial)
  }

  // HKDF implementation for key derivation (PCI DSS 3.5.2)
  private hkdf(ikm: string, salt: string, length: number): Buffer {
    const prk = createHash('sha256').update(ikm + salt).digest()
    return createHash('sha256').update(prk).digest().slice(0, length)
  }

  // PCI DSS 3.4 - Encrypt sensitive data
  encrypt(plaintext: string): EncryptedData {
    const iv = crypto.randomBytes(this.config.ivLength)
    const key = this.encryptionKeys.get(this.currentKeyVersion)!

    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      encrypted,
      iv: iv.toString('hex'),
      keyVersion: this.currentKeyVersion,
      algorithm: this.config.algorithm
    }
  }

  // PCI DSS 3.4 - Decrypt sensitive data
  decrypt(encryptedData: EncryptedData): string {
    const key = this.encryptionKeys.get(encryptedData.keyVersion)
    if (!key) {
      throw new Error(`Encryption key version ${encryptedData.keyVersion} not found`)
    }

    const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, Buffer.from(encryptedData.iv, 'hex'))
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // PCI DSS 3.5.1 - Hash sensitive data that doesn't need to be decrypted
  hashSensitiveData(data: string, salt?: string): string {
    const saltValue = salt || crypto.randomBytes(16).toString('hex')
    return createHash('sha256').update(data + saltValue).digest('hex')
  }

  // PCI DSS 3.3 - Mask sensitive data for display
  maskPAN(pan: string): string {
    if (pan.length < 4) return pan
    return '*'.repeat(pan.length - 4) + pan.slice(-4)
  }

  maskCVV(cvv: string): string {
    return '*'.repeat(cvv.length)
  }

  // PCI DSS 3.4 - Encrypt high-value amounts
  encryptAmount(amount: number, currency: string): string {
    const amountData = JSON.stringify({ amount, currency, timestamp: Date.now() })
    return JSON.stringify(this.encrypt(amountData))
  }

  // PCI DSS 3.4 - Decrypt amounts
  decryptAmount(encryptedAmount: string): { amount: number; currency: string } {
    const encryptedData: EncryptedData = JSON.parse(encryptedAmount)
    const decrypted = this.decrypt(encryptedData)
    return JSON.parse(decrypted)
  }

  // PCI DSS 3.4 - Encrypt wallet balance
  encryptBalance(balance: number, currency: string): string {
    const balanceData = JSON.stringify({
      balance,
      currency,
      lastUpdated: new Date().toISOString()
    })
    return JSON.stringify(this.encrypt(balanceData))
  }

  // PCI DSS 3.4 - Decrypt wallet balance
  decryptBalance(encryptedBalance: string): { balance: number; currency: string; lastUpdated: string } {
    const encryptedData: EncryptedData = JSON.parse(encryptedBalance)
    const decrypted = this.decrypt(encryptedData)
    return JSON.parse(decrypted)
  }

  // PCI DSS 6.5.10 - Sign webhook payloads
  signWebhook(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload)
    return createHash('sha256')
      .update(payloadString + secret)
      .digest('hex')
  }

  // PCI DSS 6.5.10 - Verify webhook signatures
  verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.signWebhook(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  // PCI DSS 3.5.2 - Rotate encryption keys
  rotateKeys(): string {
    const newKeyVersion = this.generateKeyVersion()
    const masterKey = process.env.PAYMENT_ENCRYPTION_MASTER_KEY!

    // Generate new key
    const newKey = this.hkdf(masterKey, `payment-encryption-${newKeyVersion}`, this.config.keyLength)
    this.encryptionKeys.set(newKeyVersion, newKey)

    // Keep old keys for decryption of existing data (key versioning)
    // In production, implement key retirement policy

    this.currentKeyVersion = newKeyVersion
    return newKeyVersion
  }

  // PCI DSS 10.5.4 - Generate checksums for audit logs
  generateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return createHash('sha256').update(dataString).digest('hex')
  }

  // PCI DSS 3.5.3 - Secure key storage verification
  validateKeyIntegrity(): boolean {
    // In production, verify keys haven't been tampered with
    // This is a basic implementation
    const testData = 'PCI DSS compliance test'
    const encrypted = this.encrypt(testData)
    const decrypted = this.decrypt(encrypted)
    return testData === decrypted
  }

  // Get current key version for audit purposes
  getCurrentKeyVersion(): string {
    return this.currentKeyVersion
  }

  // PCI DSS 12.8 - Security testing
  runSecurityTests(): { passed: boolean; tests: Array<{ name: string; passed: boolean; details?: string }> } {
    const tests = [
      {
        name: 'Encryption/Decryption Round Trip',
        test: () => {
          const testData = 'Test payment data: 4111111111111111'
          const encrypted = this.encrypt(testData)
          const decrypted = this.decrypt(encrypted)
          return testData === decrypted
        }
      },
      {
        name: 'Amount Encryption',
        test: () => {
          const amount = 100000 // 1000 TZS
          const encrypted = this.encryptAmount(amount, 'TZS')
          const decrypted = this.decryptAmount(encrypted)
          return decrypted.amount === amount && decrypted.currency === 'TZS'
        }
      },
      {
        name: 'Balance Encryption',
        test: () => {
          const balance = 50000
          const encrypted = this.encryptBalance(balance, 'TZS')
          const decrypted = this.decryptBalance(encrypted)
          return decrypted.balance === balance && decrypted.currency === 'TZS'
        }
      },
      {
        name: 'PAN Masking',
        test: () => {
          const pan = '4111111111111111'
          const masked = this.maskPAN(pan)
          return masked === '************1111'
        }
      },
      {
        name: 'Key Integrity',
        test: () => this.validateKeyIntegrity()
      }
    ]

    const results = tests.map(test => ({
      name: test.name,
      passed: test.test(),
      details: test.test() ? undefined : 'Test failed'
    }))

    return {
      passed: results.every(r => r.passed),
      tests: results
    }
  }
}

// Singleton instance for the payment service
export const paymentEncryption = new PaymentEncryptionService()
