/**
 * RoutingCacheDecorator
 *
 * In-memory cache layer over any RoutingProviderPort implementation.
 * Prevents redundant routing calls for identical origin–destination pairs
 * within the configured TTL (default: 5 minutes).
 *
 * Cache key precision: 4 decimal places of lat/lng ≈ 11m resolution.
 * This avoids false cache hits for meaningfully different locations while
 * still deduplicating requests for the same address.
 */

import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { RoutingProviderPort, RoutingResult } from '../../domain/engines/ports/routing-provider.port';

interface CacheEntry {
  result: RoutingResult;
  expiresAt: number; // epoch milliseconds
}

export class RoutingCacheDecorator implements RoutingProviderPort {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(
    private readonly delegate: RoutingProviderPort,
    ttlMs: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    this.ttlMs = ttlMs;
  }

  async getRoute(origin: GeoPoint, destination: GeoPoint): Promise<RoutingResult> {
    const key = this.cacheKey(origin, destination);
    const now = Date.now();

    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return { ...cached.result, source: 'cache' };
    }

    const result = await this.delegate.getRoute(origin, destination);

    // Store in cache — keep the real source so the entry can be inspected
    this.cache.set(key, {
      result,
      expiresAt: now + this.ttlMs,
    });

    return result;
  }

  /** Remove expired entries to prevent unbounded memory growth. */
  evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  /**
   * Build a deterministic cache key from origin and destination coordinates.
   * Rounded to 4 decimal places (≈ 11m precision) to deduplicate near-identical requests.
   */
  private cacheKey(origin: GeoPoint, destination: GeoPoint): string {
    const o = origin.getCoordinates();
    const d = destination.getCoordinates();
    return `${o.lat.toFixed(4)},${o.lng.toFixed(4)}→${d.lat.toFixed(4)},${d.lng.toFixed(4)}`;
  }
}
