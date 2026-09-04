/**
 * Global in-process token blacklist for the monolith.
 *
 * Since all services run in the same Node.js process, a module-level Map provides
 * instant, consistent token revocation across every service without Redis overhead.
 * On server restart, blacklisted tokens are lost — that's acceptable because JWTs
 * are also short-lived (1h). For production persistence, swap this for a Redis SET.
 */

interface BlacklistEntry {
  blacklistedAt: number;
  expiresAt: number;   // TTL = JWT expiry, so we can evict safely
  reason: string;
}

// Use globalThis so the same Map is shared even if this module is imported multiple
// times (e.g. via different require() paths in the same process).
const g = globalThis as unknown as { _maysarTokenBlacklist?: Map<string, BlacklistEntry> };
if (!g._maysarTokenBlacklist) {
  g._maysarTokenBlacklist = new Map<string, BlacklistEntry>();
}
const blacklist = g._maysarTokenBlacklist;

/** Add a token to the blacklist. expiresAt should match the JWT exp claim (ms). */
export function blacklistToken(token: string, reason: string, expiresAt?: number): void {
  const exp = expiresAt ?? Date.now() + 60 * 60 * 1000; // default 1h
  blacklist.set(token, { blacklistedAt: Date.now(), expiresAt: exp, reason });
  evictExpired();
}

/** Check whether a token has been revoked. */
export function isTokenBlacklisted(token: string): boolean {
  const entry = blacklist.get(token);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    blacklist.delete(token);
    return false;
  }
  return true;
}

/** Remove expired entries to prevent unbounded memory growth. */
function evictExpired(): void {
  if (blacklist.size <= 1000) return; // cheap early-exit for small sets
  const now = Date.now();
  for (const [token, entry] of blacklist.entries()) {
    if (now > entry.expiresAt) blacklist.delete(token);
  }
}
