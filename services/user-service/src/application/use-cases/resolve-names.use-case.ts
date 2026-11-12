import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories';
import { UserMapper } from '../mappers/user-mapper';
import { DisplayNameDto } from '../dto/user.dto';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Cache adapter contract — decouples the use case from Redis so it can be
 * unit-tested with an in-memory stub and so the use case doesn't know
 * anything about ioredis.
 *
 * All methods must be non-throwing from the use case's perspective: failures
 * are caught by the caller (the use case) and degrade to a DB-only path.
 */
export interface NameResolutionCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * Input for the bulk name resolution use case.
 *
 * `ids` may contain duplicates — the use case deduplicates internally and
 * preserves the order of first occurrence so callers receive a deterministic
 * key ordering in the resulting Map.
 */
export interface ResolveNamesInput {
  ids: string[];
}

/**
 * Output of the bulk name resolution use case.
 *
 * The Map contains an entry for every unique requested ID:
 *   - a `DisplayNameDto` when the user was resolved (from cache or DB)
 *   - `null` when the user could not be resolved
 *
 * The Map preserves the first-occurrence ordering of the input `ids`.
 */
export type ResolveNamesOutput = Map<string, DisplayNameDto | null>;

/**
 * Redis cache key prefix for a single resolved name entry.
 *
 * Format: `name-resolve:{userId}` → JSON-serialized DisplayNameDto.
 * Invalidation: deleted by `UpdateUserUseCase` after a name change.
 */
export const NAME_RESOLUTION_CACHE_PREFIX = 'name-resolve:';

/**
 * Cache TTL for a resolved name entry. 5 minutes balances freshness against
 * DB load — names change rarely and the invalidation hook on rename covers
 * the rare case where the 5-minute window would otherwise serve a stale value.
 */
export const NAME_RESOLUTION_CACHE_TTL_SECONDS = 300;

/**
 * ResolveNamesUseCase — resolves a batch of user IDs to PII-minimal display
 * name DTOs in a single round trip to the database, backed by Redis for
 * repeated lookups.
 *
 * Design notes:
 *  - One DB query for the whole batch (`userRepository.findByIds`), not N.
 *  - Unresolved IDs are never cached, so a later registration is immediately
 *    resolvable on the next call.
 *  - Redis failures are non-fatal: the use case falls through to the DB and
 *    simply skips caching, so the endpoint still returns correct data.
 *  - Deduplication preserves first-occurrence order so callers see a
 *    deterministic key order in the resulting Map.
 */
export class ResolveNamesUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly cache?: NameResolutionCache
  ) {}

  async execute(input: ResolveNamesInput): Promise<ResolveNamesOutput> {
    // Deduplicate while preserving first-occurrence order.
    const uniqueIds: string[] = [];
    const seen = new Set<string>();
    for (const id of input.ids) {
      if (!seen.has(id)) {
        seen.add(id);
        uniqueIds.push(id);
      }
    }

    const result: ResolveNamesOutput = new Map<string, DisplayNameDto | null>();

    // Phase 1: Try the cache for every ID (if a cache is wired in).
    const cacheHits = new Map<string, DisplayNameDto>();
    const misses: string[] = [];

    if (this.cache) {
      for (const id of uniqueIds) {
        try {
          const cached = await this.cache.get(NAME_RESOLUTION_CACHE_PREFIX + id);
          if (cached) {
            cacheHits.set(id, this.parseCacheEntry(id, cached));
          } else {
            misses.push(id);
          }
        } catch (cacheErr: any) {
          // Treat a cache error as a miss — we still have the DB to fall back on.
          logger.warn('Name resolution cache read failed', { userId: id, error: cacheErr?.message ?? cacheErr });
          misses.push(id);
        }
      }
    } else {
      // No cache wired in — everything is a DB miss.
      misses.push(...uniqueIds);
    }

    // Phase 2: Batch-fetch the misses from the DB in a single query.
    let dbUsers = new Map<string, User>();
    if (misses.length > 0) {
      try {
        const rows = await this.userRepository.findByIds(misses);
        for (const user of rows) {
          dbUsers.set(user.id, user);
        }
      } catch (dbErr: any) {
        // If the DB fails entirely, log and continue — every miss maps to null.
        // We never throw: the endpoint must still return a result, with nulls
        // for IDs it couldn't resolve, so the caller can render partial data.
        logger.error('Name resolution DB batch fetch failed', {
          idsCount: misses.length,
          error: dbErr?.message ?? dbErr,
        });
      }
    }

    // Phase 3: Write the freshly resolved entries back to the cache (best-effort).
    if (this.cache && dbUsers.size > 0) {
      for (const [id, user] of dbUsers) {
        const dto = UserMapper.toDisplayNameDto(user);
        try {
          await this.cache.set(
            NAME_RESOLUTION_CACHE_PREFIX + id,
            JSON.stringify(dto),
            NAME_RESOLUTION_CACHE_TTL_SECONDS
          );
        } catch (cacheErr: any) {
          logger.warn('Name resolution cache write failed', {
            userId: id,
            error: cacheErr?.message ?? cacheErr,
          });
        }
      }
    }

    // Phase 4: Build the result Map in first-occurrence order.
    for (const id of uniqueIds) {
      if (cacheHits.has(id)) {
        result.set(id, cacheHits.get(id)!);
      } else if (dbUsers.has(id)) {
        result.set(id, UserMapper.toDisplayNameDto(dbUsers.get(id)!));
      } else {
        // Unresolved IDs map to null. We deliberately do NOT cache null so a
        // user who registers later is resolvable immediately on the next call.
        result.set(id, null);
      }
    }

    return result;
  }

  /**
   * Parse a cache entry. If the JSON is corrupt, log and return a null-like
   * sentinel so the caller treats it as a miss and falls through to the DB.
   */
  private parseCacheEntry(id: string, raw: string): DisplayNameDto {
    try {
      const parsed = JSON.parse(raw) as DisplayNameDto;
      // Minimal shape check — if the cache returned garbage, fall through.
      if (typeof parsed?.fullName === 'string'
        && typeof parsed?.publicCode === 'string'
        && typeof parsed?.role === 'string') {
        return parsed;
      }
      logger.warn('Name resolution cache entry had wrong shape, falling through to DB', { userId: id });
      throw new Error('bad cache shape');
    } catch (err) {
      throw err;
    }
  }
}
