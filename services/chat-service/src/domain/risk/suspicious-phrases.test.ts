import {
  normalizeContent,
  explainModeration,
  seedPhrasesToInputs,
  seedRegexToInputs,
  SEED_SUSPICIOUS_PHRASES,
  SEED_SUSPICIOUS_REGEX,
} from "./suspicious-phrases";

describe("suspicious-phrases seed catalog", () => {
  it("includes Tanzania-specific Swahili mobile-money phrases", () => {
    const phrases = SEED_SUSPICIOUS_PHRASES.map((p) => p.phrase);
    expect(phrases).toContain("tuma kwa m-pesa");
    expect(phrases).toContain("kodi ya forodha");
    expect(phrases).toContain("malipo ya awali");
    expect(phrases).toContain("umeshinda tuzo");
    expect(phrases).toContain("nipe namba yako");
    expect(phrases).toContain("tilipanimero");
    expect(
      SEED_SUSPICIOUS_PHRASES.filter((p) => p.language === "SW").length,
    ).toBeGreaterThan(20);
  });

  it("has valid weights and descriptions for every seed entry", () => {
    for (const phrase of [
      ...SEED_SUSPICIOUS_PHRASES,
      ...SEED_SUSPICIOUS_REGEX,
    ]) {
      expect(phrase.weight ?? 70).toBeGreaterThanOrEqual(0);
      expect(phrase.weight ?? 70).toBeLessThanOrEqual(100);
      expect(phrase.description.length).toBeGreaterThan(0);
      expect(phrase.category.length).toBeGreaterThan(0);
    }
  });

  it("converts seed data into repository-ready inputs", () => {
    const inputs = [...seedPhrasesToInputs(), ...seedRegexToInputs()];
    expect(inputs.length).toBe(
      SEED_SUSPICIOUS_PHRASES.length + SEED_SUSPICIOUS_REGEX.length,
    );
    const regexInputs = inputs.filter((i) => i.matchType === "REGEX");
    expect(regexInputs.length).toBe(SEED_SUSPICIOUS_REGEX.length);
    for (const input of regexInputs) {
      expect(() => new RegExp(input.phrase, "i")).not.toThrow();
    }
  });
});

describe("normalizeContent (dynamic obfuscation defeat)", () => {
  it("decodes leet-speak", () => {
    expect(normalizeContent("tum@ p3s@")).toContain("tuma pesa");
    expect(normalizeContent("$end m0ney")).toContain("send money");
  });

  it("joins spaced-out letters", () => {
    expect(normalizeContent("t u m a  p e s a")).toContain("tuma pesa");
  });

  it("collapses repeated characters and strips zero-width chars", () => {
    expect(normalizeContent("seeeend moneeey")).toContain("send money");
    expect(normalizeContent("send\u200B money")).toContain("send money");
  });

  it("leaves plain content untouched", () => {
    expect(normalizeContent("Hello, is the item available?")).toBe(
      "hello is the item available",
    );
  });
});

describe("explainModeration (user-facing block reason)", () => {
  it("explains a blocked message with matched phrase descriptions", () => {
    const reason = explainModeration({
      matched: [
        {
          phrase: "kodi ya forodha",
          category: "advance_fee",
          description:
            "Ombi la kodi ya forodha (customs tax request — very common online-delivery scam in Tanzania)",
          action: "BLOCK",
          weight: 100,
          matchType: "SUBSTRING",
        },
      ],
      anomalySignals: [],
      status: "BLOCKED",
    });
    expect(reason).toContain("was not delivered");
    expect(reason).toContain("customs tax");
    expect(reason).toContain("contact support");
  });

  it("explains dynamic anomaly detection when no phrase matched", () => {
    const reason = explainModeration({
      matched: [],
      anomalySignals: ["hidden control characters"],
      status: "BLOCKED",
    });
    expect(reason).toContain("hidden control characters");
    expect(reason).toContain("was not delivered");
  });

  it("explains flagged (not blocked) messages", () => {
    const reason = explainModeration({
      matched: [
        {
          phrase: "whatsapp me",
          category: "off_platform_contact",
          description: "Attempt to move the conversation to WhatsApp",
          action: "FLAG",
          weight: 80,
          matchType: "SUBSTRING",
        },
      ],
      anomalySignals: [],
      status: "FLAGGED",
    });
    expect(reason).toContain("flagged for review");
    expect(reason).not.toContain("was not delivered");
  });

  it("surfaces masked phone-number evidence in the reason", () => {
    const reason = explainModeration({
      matched: [],
      anomalySignals: [],
      phoneEvidence: [
        "a phone number (071***78) was shared in the conversation — Maysar recommends keeping contact and payment on-platform",
      ],
      status: "FLAGGED",
    });
    expect(reason).toContain("071***78");
    expect(reason).toContain("phone number");
  });
});
