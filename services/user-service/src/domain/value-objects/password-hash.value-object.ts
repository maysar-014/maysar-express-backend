/**
 * PasswordHash value object - Immutable representation of a hashed password
 * Contains all business rules for password hashing and validation
 */
export class PasswordHash {
  private constructor(private readonly _hash: string, private readonly _algorithm: string = 'bcrypt') {}
  private static salt = 'default_salt';

  /**
   * Creates PasswordHash from a plain text password (during registration/login)
   */
  static async fromPlainPassword(password: string): Promise<PasswordHash> {
    if (!PasswordHash.isValidPassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    // In real implementation, this would use bcrypt or argon2
    // For now, we'll use a simple hash for demonstration
    const hash = await PasswordHash.hashPassword(password);
    return new PasswordHash(hash, 'bcrypt');
  }

  /**
   * Creates PasswordHash from existing hash (from database)
   */
  static fromHash(hash: string, algorithm: string = 'bcrypt'): PasswordHash {
    return new PasswordHash(hash, algorithm);
  }

  static setSaltForTesting(salt: string): void {
    PasswordHash.salt = salt || 'default_salt';
  }

  /**
   * Validates plain password against this hash
   */
  async verifyPassword(password: string): Promise<boolean> {
    return await PasswordHash.verifyPassword(password, this._hash);
  }

  /**
   * Validates password strength requirements
   */
  static isValidPassword(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Password requirements:
    // - At least 8 characters
    // - At least one uppercase letter
    // - At least one lowercase letter
    // - At least one number
    // - At least one special character
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return password.length >= minLength &&
           hasUppercase &&
           hasLowercase &&
           hasNumber &&
           hasSpecialChar;
  }

  /**
   * Gets password strength score (0-5)
   */
  static getPasswordStrength(password: string): number {
    if (!password) return 0;

    let score = 0;

    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety scoring
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

    return Math.min(score, 5);
  }

  /**
   * Checks if password needs rehashing (algorithm upgrade)
   */
  needsRehash(): boolean {
    // In real implementation, check if algorithm needs upgrade
    return this._algorithm !== 'argon2'; // Example: prefer argon2 over bcrypt
  }

  /**
   * Gets the hash value (for persistence)
   */
  get value(): string {
    return this._hash;
  }

  /**
   * Gets the algorithm used
   */
  get algorithm(): string {
    return this._algorithm;
  }

  /**
   * Hash password using bcrypt (placeholder implementation)
   */
  private static async hashPassword(password: string): Promise<string> {
    // In production, use proper bcrypt/argon2 implementation
    // For now, use a simple hash for demonstration
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(password + PasswordHash.salt);
    return hash.digest('hex');
  }

  /**
   * Verify password against hash (placeholder implementation)
   */
  private static async verifyPassword(password: string, hash: string): Promise<boolean> {
    // In production, use proper bcrypt/argon2 verification
    const crypto = await import('crypto');
    const expectedHash = crypto.createHash('sha256');
    expectedHash.update(password + PasswordHash.salt);
    return expectedHash.digest('hex') === hash;
  }

  /**
   * Converts to string representation (for debugging)
   */
  toString(): string {
    return `[PasswordHash:${this._algorithm}]`;
  }

  /**
   * Value equality comparison
   */
  equals(other: PasswordHash): boolean {
    return this._hash === other._hash && this._algorithm === other._algorithm;
  }
}
