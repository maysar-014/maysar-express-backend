export class SessionPolicy {
  static shouldExpire(createdAt: Date, ttlMs: number): boolean {
    return Date.now() - createdAt.getTime() >= ttlMs;
  }

  static calculateExpiry(ttlMs: number): Date {
    return new Date(Date.now() + ttlMs);
  }
}
