import Redis from 'ioredis';
import { createHash } from 'crypto';

export interface SenderContext {
  userId: string;
  messagesLast5Min: number;
  sameContentConversations: number;
}

export interface SpamScoreResult {
  score: number;
  signals: Record<string, number>;
}

// Matches http:// or https:// URLs pointing to external domains
const EXTERNAL_URL_RE = /https?:\/\/[^\s]+/gi;

// Common scam/phishing phrases (East African commerce context)
const SUSPICIOUS_PHRASES = [
  'send money',
  'western union',
  'wire transfer',
  'click here to claim',
  'you have won',
  'verify your account',
  'urgent action required',
  'limited time offer',
  'whatsapp me',
  'call me outside',
  'pay outside',
];

export class RiskEngine {
  constructor(private readonly redis: Redis) {}

  // ─── Spam Scoring ──────────────────────────────────────────────────────────

  async computeSpamScore(
    content: string | null,
    context: SenderContext,
  ): Promise<SpamScoreResult> {
    const signals: Record<string, number> = {
      urlDensity: 0,
      phishingDomain: 0,
      suspiciousPhrase: 0,
      frequency: 0,
      massMessaging: 0,
      penaltyOverride: 0,
    };

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

      // Signal 3: suspicious phrases
      const lower = content.toLowerCase();
      const matchedPhrases = SUSPICIOUS_PHRASES.filter((p) => lower.includes(p));
      signals.suspiciousPhrase = Math.min(matchedPhrases.length * 20, 60);
    }

    // Signal 4: message frequency (>20 msgs in 5 min → elevated risk)
    if (context.messagesLast5Min > 20) signals.frequency = 30;

    // Signal 5: mass messaging (same content to >5 conversations in 5 min)
    if (context.sameContentConversations > 5) signals.massMessaging = 85;

    // Signal 6: penalty override (user was previously flagged for mass messaging)
    const penaltyKey = `chat:penaltyscore:${context.userId}`;
    const penalty = await this.redis.get(penaltyKey);
    if (penalty) signals.penaltyOverride = 85;

    const score = Math.min(100, Math.max(0, ...Object.values(signals)));
    return { score, signals };
  }

  // ─── Mass-messaging detection ──────────────────────────────────────────────

  async recordMessageSent(userId: string, content: string | null): Promise<void> {
    if (!content) return;
    const contentHash = createHash('md5').update(content).digest('hex');
    const key = `chat:ratelimit:massmsg:${userId}:${contentHash}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 300); // 5-min window

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
    const contentHash = createHash('md5').update(content).digest('hex');
    const key = `chat:ratelimit:massmsg:${userId}:${contentHash}`;
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  async getMessagesLast5Min(userId: string): Promise<number> {
    const key = `chat:freq:${userId}`;
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  async incrementMessageFrequency(userId: string): Promise<void> {
    const key = `chat:freq:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 300); // 5-min window
  }

  // ─── Penalty ───────────────────────────────────────────────────────────────

  async applyPenalty(userId: string): Promise<void> {
    const key = `chat:penaltyscore:${userId}`;
    await this.redis.set(key, '85', 'EX', 3600); // 60-min penalty
  }

  // ─── Phishing domain blocklist ─────────────────────────────────────────────

  async getBlocklist(): Promise<Set<string>> {
    const members = await this.redis.smembers('chat:blocklist:domains');
    return new Set(members.map((m) => m.toLowerCase()));
  }

  async addDomain(domain: string): Promise<void> {
    await this.redis.sadd('chat:blocklist:domains', domain.toLowerCase());
  }

  async removeDomain(domain: string): Promise<void> {
    await this.redis.srem('chat:blocklist:domains', domain.toLowerCase());
  }

  async listDomains(): Promise<string[]> {
    return this.redis.smembers('chat:blocklist:domains');
  }
}
