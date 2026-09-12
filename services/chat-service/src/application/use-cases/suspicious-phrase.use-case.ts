import type {
  SuspiciousPhrase,
  EmergingPattern,
  SuspiciousPhraseInput,
} from "../../domain/entities/moderation.entity";
import type {
  ModerationRepository,
  SuspiciousPhraseUpdate,
  SuspiciousPhraseFilter,
} from "../../domain/repositories/moderation.repository.interface";
import type { EmergingPatternMiner } from "../../domain/risk/pattern-miner";
import type { SuspiciousPhraseProvider } from "../../domain/risk/suspicious-phrase.provider";
import {
  seedPhrasesToInputs,
  seedRegexToInputs,
} from "../../domain/risk/suspicious-phrases";
import { chatNotFound, chatValidationError } from "../../shared/errors";

/**
 * Admin management of the dynamic suspicious phrase/pattern registry.
 *
 * The predefined (seed) catalog is the starting point — admins can add, tune,
 * disable or delete phrases at runtime, seed the built-in catalog into the DB,
 * and review "emerging patterns" mined dynamically from flagged/blocked
 * content, promoting the real ones into the registry with one call.
 */
export class SuspiciousPhraseUseCase {
  constructor(
    private readonly moderationRepo: ModerationRepository,
    private readonly provider: SuspiciousPhraseProvider,
    private readonly miner: EmergingPatternMiner,
  ) {}

  // ── Seed / bootstrap ────────────────────────────────────────────────────────

  /**
   * Inserts the built-in seed catalog (English + Swahili/Tanzania phrases and
   * regex patterns) into the database. Existing phrases are never overwritten,
   * so admin customizations are preserved. Returns counts.
   */
  async seedDefaults(): Promise<{
    phrasesInserted: number;
    regexInserted: number;
    alreadyPresent: number;
  }> {
    const inputs = [...seedPhrasesToInputs(), ...seedRegexToInputs()];
    let phrasesInserted = 0;
    let regexInserted = 0;
    let alreadyPresent = 0;

    for (const input of inputs) {
      const existing = await this.moderationRepo.findSuspiciousPhraseByPhrase(
        input.phrase,
      );
      if (existing) {
        alreadyPresent += 1;
        continue;
      }
      await this.moderationRepo.createSuspiciousPhrase(input);
      if (input.matchType === "REGEX") regexInserted += 1;
      else phrasesInserted += 1;
    }

    if (phrasesInserted + regexInserted > 0) {
      await this.provider.invalidate();
    }
    return { phrasesInserted, regexInserted, alreadyPresent };
  }

  /** Inserts seed phrases only if the registry is completely empty (bootstrap). */
  async ensureSeeded(): Promise<boolean> {
    const count = await this.moderationRepo.countSuspiciousPhrases();
    if (count > 0) return false;
    await this.seedDefaults();
    return true;
  }

  // ── Phrase CRUD ─────────────────────────────────────────────────────────────

  async listPhrases(
    filter?: SuspiciousPhraseFilter,
  ): Promise<SuspiciousPhrase[]> {
    return this.moderationRepo.listSuspiciousPhrases(filter);
  }

  async getPhrase(id: string): Promise<SuspiciousPhrase> {
    const phrase = await this.moderationRepo.findSuspiciousPhraseById(id);
    if (!phrase) throw chatNotFound("Suspicious phrase");
    return phrase;
  }

  async createPhrase(input: SuspiciousPhraseInput): Promise<SuspiciousPhrase> {
    const phrase = input.phrase.trim();
    if (!phrase) throw chatValidationError("phrase must not be empty");
    if (phrase.length > 300)
      throw chatValidationError("phrase must be ≤ 300 characters");

    if (input.matchType === "REGEX") this.validateRegex(phrase);

    const existing =
      await this.moderationRepo.findSuspiciousPhraseByPhrase(phrase);
    if (existing)
      throw chatValidationError(
        `phrase "${phrase}" already exists in the registry`,
      );

    const created = await this.moderationRepo.createSuspiciousPhrase({
      ...input,
      phrase,
      source: input.source ?? "ADMIN",
    });
    await this.provider.invalidate();
    return created;
  }

  async updatePhrase(
    id: string,
    input: SuspiciousPhraseUpdate,
  ): Promise<SuspiciousPhrase> {
    const updated = await this.moderationRepo.updateSuspiciousPhrase(id, input);
    if (!updated) throw chatNotFound("Suspicious phrase");
    await this.provider.invalidate();
    return updated;
  }

  async deletePhrase(id: string): Promise<void> {
    const phrase = await this.moderationRepo.findSuspiciousPhraseById(id);
    if (!phrase) throw chatNotFound("Suspicious phrase");
    await this.moderationRepo.deleteSuspiciousPhrase(id);
    await this.provider.invalidate();
  }

  // ── Emerging patterns (dynamic layer) ──────────────────────────────────────

  /** Triggers the dynamic miner immediately instead of waiting for the hourly job. */
  async minePatterns(options?: {
    days?: number;
    limit?: number;
  }): Promise<number> {
    return this.miner.run(options);
  }

  async listEmergingPatterns(
    status?: EmergingPattern["status"],
  ): Promise<EmergingPattern[]> {
    return this.moderationRepo.listEmergingPatterns(status ?? "PENDING");
  }

  async promoteEmergingPattern(
    patternId: string,
    overrides?: {
      action?: "FLAG" | "BLOCK";
      weight?: number;
      category?: string;
    },
  ): Promise<EmergingPattern> {
    const promoted = await this.miner.promote(patternId, overrides);
    if (!promoted) throw chatNotFound("Emerging pattern");
    await this.provider.invalidate();
    return promoted;
  }

  async dismissEmergingPattern(patternId: string): Promise<EmergingPattern> {
    const dismissed = await this.miner.dismiss(patternId);
    if (!dismissed) throw chatNotFound("Emerging pattern");
    return dismissed;
  }

  private validateRegex(pattern: string): void {
    try {
      new RegExp(pattern, "i");
    } catch {
      throw chatValidationError(`invalid regular expression: ${pattern}`);
    }
  }
}
