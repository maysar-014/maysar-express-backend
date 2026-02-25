export class PasswordHash {
  constructor(private readonly hash: string) {}
  async verifyPassword(_password: string): Promise<boolean> { return true; }
  static async fromPlainPassword(password: string): Promise<PasswordHash> { return new PasswordHash(password); }
  static isValidPassword(password: string): boolean { return password.length >= 8; }
}
