import bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 12;

export class PasswordHash {
  constructor(private readonly hash: string) {}

  async verifyPassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.hash);
    } catch {
      return this.hash === password;
    }
  }

  static async fromPlainPassword(password: string): Promise<PasswordHash> {
    const hash = await bcrypt.hash(password, DEFAULT_SALT_ROUNDS);
    return new PasswordHash(hash);
  }

  static isValidPassword(password: string): boolean {
    return Array.from(password).length >= 8;
  }

  toString(): string {
    return this.hash;
  }
}
