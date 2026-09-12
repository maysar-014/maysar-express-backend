import { createHash } from "crypto";
import {
  normalizeContent,
  explainModeration,
  seedPhrasesToInputs,
  seedRegexToInputs,
  type MatchedSuspiciousPattern,
} from "./suspicious-phrases";
import {
  detectPhoneNumbers,
  PHONE_CONTACT_INTENT_RE,
  PHONE_PAYMENT_INTENT_RE,
  PHONE_CONTEXT_CATEGORIES,
} from "./phone-detector";
import type { SuspiciousPhraseProvider } from "./suspicious-phrase.provider";
import type { SuspiciousPhraseInput } from "../entities/moderation.entity";

export interface RiskStateStore {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: string,
    durationSeconds?: number,
  ): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, member: string): Promise<number>;
  srem(key: string, member: string): Promise<number>;
  del?(key: string): Promise<number>;
}

export interface SenderContext {
  userId: string;
  messagesLast5Min: number;
  sameContentConversations: number;
}

export interface SpamScoreResult {
  score: number;
  signals: Record<string, number>;
  /** Phrases/patterns (seed, admin-configured, or regex) found in the content. */
  matchedPatterns: MatchedSuspiciousPattern[];
  /** Dynamic/anomaly heuristics triggered (e.g. obfuscation, encoded blobs). */
  anomalySignals: string[];
  /** Human-readable explanation for FLAGGED/BLOCKED messages (null when ACTIVE). */
  moderationReason: string | null;
  /** Structured moderation payload persisted on the message row. */
  moderationSignals: Record<string, unknown>;
}

// Spam score thresholds — single source of truth for flag/block decisions.
export const FLAG_THRESHOLD = 70;
export const BLOCK_THRESHOLD = 90;

// Zero-width / bidi control characters used to smuggle content past filters
const ZERO_WIDTH_RE = /[\u200B-\u200F\u2060\u202A-\u202E\uFEFF]/g;

// Link shorteners hiding a real destination
const SHORTENER_RE =
  /\b(?:bit\.ly|tinyurl\.com|cutt\.us|rb\.gy|shorturl\.at|is\.gd|t\.co)\b/i;

// Base64-like encoded blobs
const ENCODED_BLOB_RE = /\b[A-Za-z0-9+/]{40,}={0,2}\b/;

// Emoji detection
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

// Leet-speak adjacent to letters (tum@, $end, m3s@ji)
const LEET_ADJACENT_RE = /[a-z$€£@][0345789$€£@]|[0345789$€£@][a-z]/g;

// Matches http:// or https:// URLs pointing to external domains
const EXTERNAL_URL_RE = /https?:\/\/[^\s]+/gi;

export class RiskEngine {
  private readonly store: RiskStateStore;
  private readonly phraseProvider: SuspiciousPhraseProvider | null;

  constructor(
    store: RiskStateStore,
    phraseProvider?: SuspiciousPhraseProvider | null,
  ) {
    this.store = store;
    this.phraseProvider = phraseProvider ?? null;
  }

  // ─── Dynamic phrase registry ────────────────────────────────────────────────

  /**
   * Returns active suspicious phrases/patterns from the dynamic registry when a
   * provider is wired (DB-backed, admin-managed, Redis-cached), otherwise falls
   * back to the built-in seed catalog so protection is never empty.
   */
  async getPhrases(): Promise<SuspiciousPhraseInput[]> {
    if (this.phraseProvider) {
      return this.phraseProvider.getPhrases();
    }
    return [...seedPhrasesToInputs(), ...seedRegexToInputs()];
  }

  private async matchPhrases(
    content: string,
  ): Promise<MatchedSuspiciousPattern[]> {
    const phrases = await this.getPhrases();
    const normalizedContent = normalizeContent(content);
    const matched: MatchedSuspiciousPattern[] = [];

    for (const phrase of phrases) {
      try {
        if (phrase.matchType === "REGEX") {
          if (new RegExp(phrase.phrase, "i").test(content)) {
            matched.push({
              phrase: phrase.phrase,
              category: phrase.category,
              description: phrase.description ?? null,
              action: phrase.action ?? "FLAG",
              weight: phrase.weight ?? 70,
              matchType: "REGEX",
            });
          }
        } else {
          const normalizedPhrase = normalizeContent(phrase.phrase);
          if (
            normalizedPhrase &&
            normalizedContent.includes(normalizedPhrase)
          ) {
            matched.push({
              phrase: phrase.phrase,
              category: phrase.category,
              description: phrase.description ?? null,
              action: phrase.action ?? "FLAG",
              weight: phrase.weight ?? 70,
              matchType: "SUBSTRING",
            });
          }
        }
      } catch {
        // invalid admin-provided regex — never crash the send path
      }
    }
    return matched;
  }

  // ─── Spam Scoring ──────────────────────────────────────────────────────────

  async computeSpamScore(
    content: string | null,
    context: SenderContext,
  ): Promise<SpamScoreResult> {
    const signals: Record<string, number> = {
      urlDensity: 0,
      phishingDomain: 0,
      suspiciousPhrase: 0,
      phoneNumber: 0,
      anomaly: 0,
      frequency: 0,
      massMessaging: 0,
      penaltyOverride: 0,
    };

    let matchedPatterns: MatchedSuspiciousPattern[] = [];
    let anomalySignals: string[] = [];
    let phoneEvidence: string[] = [];

    if (content) {
      // Signal 1: external URL density
      const urls = content.match(EXTERNAL_URL_RE) ?? [];
      signals.urlDensity = Math.min(urls.length * 15, 60);

      // Signal 2: phishing domain match
      const blocklist = await this.getBlocklist();
      const hasPhishing = urls.some((url) => {
        try {
          const hostname = new URL(url).hostname.toLowerCase();
          return blocklist.has(hostname);
        } catch {
          return false;
        }
      });
      if (hasPhishing) signals.phishingDomain = 100;

      // Signal 3: suspicious phrases/patterns (dynamic registry — seed, admin and
      // regex patterns, matched against obfuscation-normalized content)
      matchedPatterns = await this.matchPhrases(content);
      const blockMatches = matchedPatterns.filter((m) => m.action === "BLOCK");
      const flagMatches = matchedPatterns.filter((m) => m.action === "FLAG");
      if (blockMatches.length > 0) {
        signals.suspiciousPhrase = 100;
      } else if (flagMatches.length > 0) {
        const maxWeight = Math.max(...flagMatches.map((m) => m.weight));
        signals.suspiciousPhrase = Math.min(
          95,
          maxWeight + 10 * (flagMatches.length - 1),
        );
      }

      // Signal 4: Tanzanian phone-number detection — context-aware policy:
      //   phone alone → FLAG (shared contact info, review context)
      //   phone + off-platform contact/payment intent → BLOCK
      const phoneNumbers = detectPhoneNumbers(content);
      if (phoneNumbers.length > 0) {
        const raw = content.toLowerCase();
        const hasContactIntent =
          matchedPatterns.some((m) => m.category === "off_platform_contact") ||
          PHONE_CONTACT_INTENT_RE.test(raw);
        const hasPaymentIntent =
          matchedPatterns.some((m) =>
            PHONE_CONTEXT_CATEGORIES.has(m.category),
          ) || PHONE_PAYMENT_INTENT_RE.test(raw);

        const masked = phoneNumbers.map(
          (p) => `${p.slice(0, 3)}***${p.slice(-2)}`,
        );
        if (hasContactIntent || hasPaymentIntent) {
          signals.phoneNumber = 95;
          phoneEvidence.push(
            `a phone number (${masked.join(", ")}) was shared together with off-platform contact/payment intent`,
          );
        } else {
          signals.phoneNumber = 70;
          phoneEvidence.push(
            `a phone number (${masked.join(", ")}) was shared in the conversation — Maysar recommends keeping contact and payment on-platform`,
          );
        }
      }

      // Signal 5: dynamic anomaly heuristics — structural detection of evolved /
      // previously-unknown suspicious content that is not on the predefined list
      const anomaly = computeAnomalySignals(content);
      anomalySignals = anomaly.signals;
      signals.anomaly = anomaly.score;
    }

    // Signal 5: message frequency (>20 msgs in 5 min → elevated risk)
    if (context.messagesLast5Min > 20) signals.frequency = 30;

    // Signal 6: mass messaging (same content to >5 conversations in 5 min)
    if (context.sameContentConversations > 5) signals.massMessaging = 85;

    // Signal 7: penalty override (user was previously flagged for mass messaging)
    const penaltyKey = `chat:penaltyscore:${context.userId}`;
    const penalty = await this.store.get(penaltyKey);
    if (penalty) signals.penaltyOverride = 85;

    const score = Math.min(100, Math.max(0, ...Object.values(signals)));

    const moderationReason =
      score >= BLOCK_THRESHOLD
        ? explainModeration({
            matched: matchedPatterns,
            anomalySignals,
            phoneEvidence,
            status: "BLOCKED",
          })
        : score >= FLAG_THRESHOLD
          ? explainModeration({
              matched: matchedPatterns,
              anomalySignals,
              phoneEvidence,
              status: "FLAGGED",
            })
          : null;

    const moderationSignals: Record<string, unknown> = {
      score,
      signals,
      matchedPatterns: matchedPatterns.map((m) => ({
        phrase: m.phrase,
        category: m.category,
        action: m.action,
        weight: m.weight,
        matchType: m.matchType,
      })),
      anomalySignals,
      phoneEvidence,
      evaluatedAt: new Date().toISOString(),
    };

    return {
      score,
      signals,
      matchedPatterns,
      anomalySignals,
      moderationReason,
      moderationSignals,
    };
  }

  // ─── Mass-messaging detection ──────────────────────────────────────────────

  async recordMessageSent(
    userId: string,
    content: string | null,
  ): Promise<void> {
    if (!content) return;
    const contentHash = createHash("md5").update(content).digest("hex");
    const key = `chat:ratelimit:massmsg:${userId}:${contentHash}`;
    const count = await this.store.incr(key);
    if (count === 1) await this.store.expire(key, 300); // 5-min window

    // If same content sent to >5 conversations, apply penalty
    if (count > 5) {
      await this.applyPenalty(userId);
    }
  }

  async getSameContentConversationCount(
    userId: string,
    content: string | null,
  ): Promise<number> {
    if (!content) return 0;
    const contentHash = createHash("md5").update(content).digest("hex");
    const key = `chat:ratelimit:massmsg:${userId}:${contentHash}`;
    const val = await this.store.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  async getMessagesLast5Min(userId: string): Promise<number> {
    const key = `chat:freq:${userId}`;
    const val = await this.store.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  async incrementMessageFrequency(userId: string): Promise<void> {
    const key = `chat:freq:${userId}`;
    const count = await this.store.incr(key);
    if (count === 1) await this.store.expire(key, 300); // 5-min window
  }

  // ─── Penalty ───────────────────────────────────────────────────────────────

  async applyPenalty(userId: string): Promise<void> {
    const key = `chat:penaltyscore:${userId}`;
    await this.store.set(key, "85", "EX", 3600); // 60-min penalty
  }

  // ─── Phishing domain blocklist ─────────────────────────────────────────────

  async getBlocklist(): Promise<Set<string>> {
    const members = await this.store.smembers("chat:blocklist:domains");
    return new Set(members.map((m) => m.toLowerCase()));
  }

  async addDomain(domain: string): Promise<void> {
    await this.store.sadd("chat:blocklist:domains", domain.toLowerCase());
  }

  async removeDomain(domain: string): Promise<void> {
    await this.store.srem("chat:blocklist:domains", domain.toLowerCase());
  }

  async listDomains(): Promise<string[]> {
    return this.store.smembers("chat:blocklist:domains");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic anomaly heuristics
//
// These detect suspicious *structure* rather than specific phrases, so content
// that is not on the predefined list (or that deliberately evolves to evade it)
// is still scored. Each signal carries a weighted score; explanations are shown
// to users in the moderation reason.
// ─────────────────────────────────────────────────────────────────────────────

export interface AnomalyResult {
  score: number;
  signals: string[];
}

export function computeAnomalySignals(content: string): AnomalyResult {
  const signals: string[] = [];
  let score = 0;
  const add = (signal: string, points: number): void => {
    signals.push(signal);
    score += points;
  };

  // Zero-width / bidi control characters (classic filter evasion)
  if (ZERO_WIDTH_RE.test(content)) {
    ZERO_WIDTH_RE.lastIndex = 0;
    add("hidden control characters", 45);
  }

  // Leet-speak obfuscation adjacent to letters (tum@, $end, m3s@ji)
  const leetHits = content.toLowerCase().match(LEET_ADJACENT_RE)?.length ?? 0;
  if (leetHits >= 2) add("character substitution to disguise words", 55);
  else if (leetHits === 1) score += 15;

  // Spaced-out letter sequences ("t u m a  p e s a")
  const stripped = content.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = stripped.split(/\s+/);
  let spacedRuns = 0;
  let run = 0;
  for (const token of tokens) {
    if (token.length === 1) {
      run += 1;
      if (run === 3) spacedRuns += 1;
    } else {
      run = 0;
    }
  }
  if (spacedRuns > 0) add("letters spaced out to disguise words", 55);

  // Repeated-character runs ("seeeend moneeey")
  if (/([a-z])\1{2,}/i.test(content))
    add("exaggerated repeated characters", 35);

  // CAPS flood (20+ letters, >70% uppercase)
  const letters = content.match(/[A-Za-z]/g)?.length ?? 0;
  const caps = content.match(/[A-Z]/g)?.length ?? 0;
  if (letters >= 20 && caps / letters > 0.7)
    add("excessive capital letters", 30);

  // Encoded / obfuscated blobs
  if (ENCODED_BLOB_RE.test(content))
    add("encoded or obfuscated content blob", 40);

  // Link shorteners hiding the real destination
  if (SHORTENER_RE.test(content)) add("disguised (shortened) link", 45);

  // Punctuation flood in short messages
  if (
    content.length < 500 &&
    (content.match(/[!?.,;:]{1}/g)?.length ?? 0) > 15
  ) {
    add("excessive punctuation", 25);
  }

  // Emoji flood
  if ((content.match(EMOJI_RE)?.length ?? 0) > 8) add("excessive emoji", 20);

  return { score: Math.min(100, score), signals };
}
