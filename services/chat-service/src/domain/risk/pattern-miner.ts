import type { PrismaClient } from "@prisma/client";
import type { EmergingPattern } from "../entities/moderation.entity";

// ─────────────────────────────────────────────────────────────────────────────
// Emerging-pattern miner — the dynamic layer beyond the predefined list.
//
// Scans recently flagged/blocked messages, extracts word n-grams that recur
// across different senders/conversations, and records the recurring ones as
// PENDING "emerging patterns". Admins review them in the moderation dashboard
// and can promote them to active suspicious phrases (source AUTO) with one
// call, closing the feedback loop for evolving scam content without a redeploy.
// ─────────────────────────────────────────────────────────────────────────────

const MIN_WORD_LENGTH = 4;
const MIN_NGRAM_LENGTH = 2;
const MAX_NGRAM_LENGTH = 5;
const MIN_OCCURRENCES = 3;
const MIN_CONVERSATIONS = 2;
const SCAN_LIMIT = 500;
const SCAN_DAYS = 7;

/** Very common words (EN + Swahili) that never form a suspicious pattern alone. */
const STOPWORDS = new Set([
  // Swahili
  "kwa",
  "na",
  "ya",
  "wa",
  "yangu",
  "yako",
  "hii",
  "hiyo",
  "hilo",
  "haya",
  "nime",
  "unataka",
  "tafadhali",
  "asante",
  "karibu",
  "ndiyo",
  "hapana",
  "sasa",
  "sana",
  "zaidi",
  "nataka",
  "tunataka",
  "kuna",
  "hapa",
  "kule",
  "mimi",
  "wewe",
  "wao",
  "sisi",
  "nyinyi",
  "yake",
  "yao",
  "zao",
  "watu",
  "nyumba",
  "mtandaoni",
  "kuhusu",
  "kwenda",
  "kuja",
  "kuona",
  "kuwa",
  "kufanya",
  "kusema",
  "kupata",
  // English
  "the",
  "and",
  "you",
  "for",
  "are",
  "with",
  "this",
  "that",
  "have",
  "not",
  "was",
  "they",
  "from",
  "will",
  "would",
  "there",
  "their",
  "what",
  "about",
  "please",
  "thanks",
  "thank",
  "hello",
  "your",
  "yours",
  "does",
  "when",
  "time",
  "just",
  "like",
  "want",
  "need",
  "much",
  "very",
  "here",
  "still",
  "than",
  "then",
  "them",
  "been",
  "some",
  "something",
  "anything",
  "everything",
  "everyone",
]);

const URLISH_RE = /^(?:https?:\/\/|\w+\.\w{2,})/i;

function isStopwordish(ngram: string[]): boolean {
  return ngram.every(
    (w) => STOPWORDS.has(w) || w.length < MIN_WORD_LENGTH || URLISH_RE.test(w),
  );
}

export class EmergingPatternMiner {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Scans recent flagged/blocked messages and upserts recurring n-grams into
   * chat_emerging_patterns. Returns the number of messages scanned.
   */
  async run(options?: { days?: number; limit?: number }): Promise<number> {
    const days = options?.days ?? SCAN_DAYS;
    const limit = options?.limit ?? SCAN_LIMIT;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const messages = await this.prisma.chat_Message.findMany({
      where: {
        moderationStatus: { in: ["FLAGGED", "BLOCKED"] },
        content: { not: null },
        deletedAt: null,
        createdAt: { gte: cutoff },
      },
      select: { id: true, content: true, conversationId: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    if (messages.length === 0) return 0;

    const counts = this.countNgrams(messages);
    for (const [phrase, entry] of counts) {
      if (entry.occurrences < MIN_OCCURRENCES) continue;
      if (entry.conversations.size < MIN_CONVERSATIONS) continue;
      await this.upsertPattern(
        phrase,
        entry.occurrences,
        entry.conversations.size,
        entry.sampleId,
      );
    }

    return messages.length;
  }

  private countNgrams(
    messages: Array<{
      id: string;
      content: string | null;
      conversationId: string;
    }>,
  ): Map<
    string,
    { occurrences: number; conversations: Set<string>; sampleId: string }
  > {
    const counts = new Map<
      string,
      { occurrences: number; conversations: Set<string>; sampleId: string }
    >();
    for (const message of messages) {
      const words = this.tokenize(message.content ?? "");
      if (words.length < MIN_NGRAM_LENGTH) continue;

      const seen = new Set<string>();
      for (let n = MIN_NGRAM_LENGTH; n <= MAX_NGRAM_LENGTH; n++) {
        for (let i = 0; i + n <= words.length; i++) {
          const ngram = words.slice(i, i + n);
          if (isStopwordish(ngram)) continue;
          const phrase = ngram.join(" ");
          if (seen.has(phrase)) continue; // count each n-gram once per message
          seen.add(phrase);

          const entry = counts.get(phrase) ?? {
            occurrences: 0,
            conversations: new Set<string>(),
            sampleId: message.id,
          };
          entry.occurrences += 1;
          entry.conversations.add(message.conversationId);
          counts.set(phrase, entry);
        }
      }
    }
    return counts;
  }

  async listPending(): Promise<EmergingPattern[]> {
    const rows = await this.prisma.chat_EmergingPattern.findMany({
      where: { status: "PENDING" },
      orderBy: [{ occurrences: "desc" }, { lastSeenAt: "desc" }],
      take: 100,
    });
    return rows.map((row) => this.mapPattern(row));
  }

  /** Promotes an emerging pattern into an active suspicious phrase (source AUTO). */
  async promote(
    patternId: string,
    overrides?: {
      action?: "FLAG" | "BLOCK";
      weight?: number;
      category?: string;
    },
  ): Promise<EmergingPattern | null> {
    const row = await this.prisma.chat_EmergingPattern.findUnique({
      where: { id: patternId },
    });
    if (!row) return null;

    await this.prisma.chat_SuspiciousPhrase.upsert({
      where: { phrase: row.phrase },
      create: {
        phrase: row.phrase,
        matchType: "SUBSTRING",
        language: "OTHER",
        category: overrides?.category ?? "emerging_pattern",
        description: `Recurring pattern detected across flagged/blocked messages (${row.occurrences} occurrences in ${row.conversationCount} conversations)`,
        weight: overrides?.weight ?? Math.min(95, 70 + row.occurrences),
        action: overrides?.action ?? "FLAG",
        isActive: true,
        source: "AUTO",
      },
      update: {
        isActive: true,
        action: overrides?.action ?? "FLAG",
        weight: overrides?.weight ?? Math.min(95, 70 + row.occurrences),
        source: "AUTO",
      },
    });

    const updated = await this.prisma.chat_EmergingPattern.update({
      where: { id: patternId },
      data: { status: "PROMOTED" },
    });
    return this.mapPattern(updated);
  }

  async dismiss(patternId: string): Promise<EmergingPattern | null> {
    const row = await this.prisma.chat_EmergingPattern.findUnique({
      where: { id: patternId },
    });
    if (!row) return null;
    const updated = await this.prisma.chat_EmergingPattern.update({
      where: { id: patternId },
      data: { status: "DISMISSED" },
    });
    return this.mapPattern(updated);
  }

  private async upsertPattern(
    phrase: string,
    occurrences: number,
    conversationCount: number,
    sampleId: string,
  ): Promise<void> {
    await this.prisma.chat_EmergingPattern.upsert({
      where: { phrase },
      create: {
        phrase,
        occurrences,
        conversationCount,
        sampleMessageIds: [sampleId],
        status: "PENDING",
      },
      update: {
        occurrences: { increment: 1 },
        conversationCount,
        lastSeenAt: new Date(),
      },
    });
  }

  private tokenize(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  private mapPattern(row: {
    id: string;
    phrase: string;
    occurrences: number;
    conversationCount: number;
    sampleMessageIds: unknown;
    status: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
  }): EmergingPattern {
    return {
      id: row.id,
      phrase: row.phrase,
      occurrences: row.occurrences,
      conversationCount: row.conversationCount,
      sampleMessageIds: Array.isArray(row.sampleMessageIds)
        ? (row.sampleMessageIds as string[])
        : [],
      status: row.status as EmergingPattern["status"],
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
    };
  }
}
