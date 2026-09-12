import type {
  SuspiciousPhrase,
  SuspiciousPhraseInput,
} from "../entities/moderation.entity";
import type { SuspiciousPhraseFilter } from "../repositories/moderation.repository.interface";

export interface SuspiciousPhraseProvider {
  /** Returns all active suspicious phrase/pattern definitions (seed + admin + auto). */
  getPhrases(): Promise<SuspiciousPhraseInput[]>;
  /** Invalidates the provider cache after admin CRUD changes. */
  invalidate(): Promise<void>;
}

/**
 * Dynamic phrase registry provider.
 *
 * Phrases/patterns live in the database (chat_suspicious_phrases) so admins can
 * add, tune, disable or remove them at runtime without a redeploy. Results are
 * cached in Redis with a short TTL to keep the message-send path fast. When the
 * database has no phrases yet (fresh deployment) the built-in seed catalog is
 * used as a fallback so protection is never empty.
 */
export class DynamicSuspiciousPhraseProvider implements SuspiciousPhraseProvider {
  private static readonly CACHE_KEY = "chat:suspicious:phrases:v1";
  private static readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly store: {
      get(key: string): Promise<string | null>;
      set(
        key: string,
        value: string,
        mode?: string,
        durationSeconds?: number,
      ): Promise<unknown>;
      del?(key: string): Promise<number>;
    },
    private readonly repo: {
      listSuspiciousPhrases(
        filter?: SuspiciousPhraseFilter,
      ): Promise<SuspiciousPhrase[]>;
    },
    private readonly fallbackPhrases: SuspiciousPhraseInput[],
  ) {}

  async getPhrases(): Promise<SuspiciousPhraseInput[]> {
    // 1. Redis cache
    try {
      const cached = await this.store.get(
        DynamicSuspiciousPhraseProvider.CACHE_KEY,
      );
      if (cached) {
        const parsed = JSON.parse(cached) as SuspiciousPhraseInput[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // cache failure — fall through to DB
    }

    // 2. Database
    try {
      const rows = await this.repo.listSuspiciousPhrases({ activeOnly: true });
      if (rows.length > 0) {
        const inputs = rows.map(
          (r): SuspiciousPhraseInput => ({
            phrase: r.phrase,
            matchType: r.matchType,
            language: r.language,
            category: r.category,
            description: r.description,
            weight: r.weight,
            action: r.action,
            isActive: r.isActive,
            source: r.source,
          }),
        );
        await this.setCache(inputs);
        return inputs;
      }
    } catch {
      // DB failure — fall through to built-in defaults
    }

    // 3. Built-in seed catalog (fresh deployment / degraded mode)
    return this.fallbackPhrases;
  }

  async invalidate(): Promise<void> {
    try {
      if (this.store.del) {
        await this.store.del(DynamicSuspiciousPhraseProvider.CACHE_KEY);
      }
    } catch {
      // ignore — cache expires via TTL anyway
    }
  }

  private async setCache(inputs: SuspiciousPhraseInput[]): Promise<void> {
    try {
      await this.store.set(
        DynamicSuspiciousPhraseProvider.CACHE_KEY,
        JSON.stringify(inputs),
        "EX",
        DynamicSuspiciousPhraseProvider.CACHE_TTL_SECONDS,
      );
    } catch {
      // ignore — cache is best-effort
    }
  }
}
