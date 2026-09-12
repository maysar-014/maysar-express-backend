import { RiskEngine, computeAnomalySignals } from "../risk-engine";

describe("RiskEngine", () => {
  const store = {
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    smembers: jest.fn(),
    sadd: jest.fn(),
    srem: jest.fn(),
  };

  const engine = new RiskEngine(store);

  beforeEach(() => {
    jest.clearAllMocks();
    store.smembers.mockResolvedValue([]);
  });

  it("scores content with suspicious phrases and URLs", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "Send money here https://example.com now",
      { userId: "user-1", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.signals.urlDensity).toBeGreaterThan(0);
    expect(result.signals.suspiciousPhrase).toBeGreaterThan(0);
  });

  it("tracks message frequency and penalties using the shared store", async () => {
    store.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    store.get.mockResolvedValueOnce("2").mockResolvedValueOnce(null);

    await engine.recordMessageSent("user-1", "hello");
    await engine.incrementMessageFrequency("user-1");

    expect(store.incr).toHaveBeenCalled();
    expect(store.expire).toHaveBeenCalledWith(
      expect.stringContaining("chat:ratelimit:massmsg:user-1"),
      300,
    );
    expect(
      await engine.getSameContentConversationCount("user-1", "hello"),
    ).toBe(2);
    expect(await engine.getMessagesLast5Min("user-1")).toBe(0);
  });

  it("manages blocklist domains and applies penalties", async () => {
    store.smembers
      .mockResolvedValueOnce(["bad.example"])
      .mockResolvedValueOnce(["bad.example"]);
    store.get.mockResolvedValueOnce("85");

    await engine.addDomain("bad.example");
    await engine.removeDomain("bad.example");

    const blocklist = await engine.getBlocklist();
    const domains = await engine.listDomains();
    const score = await engine.computeSpamScore(
      "visit https://bad.example now",
      { userId: "user-2", messagesLast5Min: 25, sameContentConversations: 10 },
    );

    expect(store.sadd).toHaveBeenCalledWith(
      "chat:blocklist:domains",
      "bad.example",
    );
    expect(store.srem).toHaveBeenCalledWith(
      "chat:blocklist:domains",
      "bad.example",
    );
    expect(blocklist.has("bad.example")).toBe(true);
    expect(domains).toEqual(["bad.example"]);
    expect(score.signals.penaltyOverride).toBe(85);
  });

  it("blocks Tanzanian Swahili scam phrases with a human-readable reason", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "Habari, tuma kwa m-pesa hapo baada ya kupokea bidhaa",
      { userId: "user-3", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(
      result.matchedPatterns.some((m) => m.phrase === "tuma kwa m-pesa"),
    ).toBe(true);
    expect(result.moderationReason).toContain("was not delivered");
    expect(result.moderationReason).toContain("M-Pesa outside the platform");
    expect(result.moderationSignals.matchedPatterns).toHaveLength(
      result.matchedPatterns.length,
    );
  });

  it("detects obfuscated phrases via normalization and reports them", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore("senddd meee moneyyyy", {
      userId: "user-4",
      messagesLast5Min: 0,
      sameContentConversations: 0,
    });

    expect(result.signals.suspiciousPhrase).toBeGreaterThan(0);
    expect(
      result.matchedPatterns.some((m) => m.phrase === "send me money"),
    ).toBe(true);
    expect(result.moderationReason).toContain("flagged");
  });

  it("scores previously-unknown content through dynamic anomaly heuristics", async () => {
    store.get.mockResolvedValue(null);

    const obfuscated = await engine.computeSpamScore(
      "h\u200Bei t u m a   p3s@ ya$$o kwa namba hii",
      { userId: "user-5", messagesLast5Min: 0, sameContentConversations: 0 },
    );
    expect(obfuscated.signals.anomaly).toBeGreaterThan(0);
    expect(obfuscated.anomalySignals.length).toBeGreaterThan(0);

    const anomaly = computeAnomalySignals(
      "URGENT RESPONSE REQUIRED NOW!!! CLICK THIS LINK bit.ly/xyz OR SEND PAYMENT",
    );
    expect(anomaly.score).toBeGreaterThan(0);
    expect(anomaly.signals).toContain("disguised (shortened) link");
    expect(anomaly.signals).toContain("excessive capital letters");
  });

  it("leaves normal conversation content ACTIVE with no reason", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "Hello, is this item still available? I can pick it up tomorrow.",
      { userId: "user-6", messagesLast5Min: 1, sameContentConversations: 0 },
    );

    expect(result.score).toBeLessThan(70);
    expect(result.moderationReason).toBeNull();
  });

  it("uses the dynamic phrase provider when wired", async () => {
    const provider = {
      getPhrases: jest.fn().mockResolvedValue([
        {
          phrase: "kazi ya wizi",
          matchType: "SUBSTRING",
          language: "SW",
          category: "admin_added",
          description: "Admin-added phrase",
          weight: 100,
          action: "BLOCK",
          isActive: true,
          source: "ADMIN",
        },
      ]),
      invalidate: jest.fn().mockResolvedValue(undefined),
    };
    const dynamicEngine = new RiskEngine(store, provider as never);
    store.get.mockResolvedValue(null);

    const result = await dynamicEngine.computeSpamScore(
      "niulize kazi ya wizi tu",
      { userId: "user-7", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    expect(provider.getPhrases).toHaveBeenCalled();
    expect(
      result.matchedPatterns.some((m) => m.phrase === "kazi ya wizi"),
    ).toBe(true);
    expect(result.score).toBe(100);
  });

  it("flags a phone number alone (no block) with masked evidence", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "Unaweza kupata namba hii 0712 345 678 kwenye profile",
      { userId: "user-8", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    expect(result.signals.phoneNumber).toBe(70);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.score).toBeLessThan(90);
    expect(result.moderationReason).toContain("phone number");
    expect(result.moderationReason).toContain("071***78"); // masked, not raw
    expect(result.moderationSignals.phoneEvidence).toBeTruthy();
  });

  it("blocks a phone number combined with off-platform contact intent", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "WhatsApp me on 0712-345-678 to arrange delivery",
      { userId: "user-9", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    expect(result.signals.phoneNumber).toBe(95);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.moderationReason).toContain(
      "off-platform contact/payment intent",
    );
  });

  it("blocks a phone number combined with mobile-money/payment intent", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "tuma kwa m-pesa kwenye +255 712 345 678",
      { userId: "user-10", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    expect(result.signals.phoneNumber).toBe(95);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.moderationReason).toContain("phone number");
  });

  it("does not treat a generic bank-style number as a phone", async () => {
    store.get.mockResolvedValue(null);

    const result = await engine.computeSpamScore(
      "My bank account number is 1234567890123456, please use it",
      { userId: "user-11", messagesLast5Min: 0, sameContentConversations: 0 },
    );

    // Not a linked account (doesn't match the 0[67]/255[67] mobile trunk).
    expect(
      (result.moderationSignals.phoneEvidence as unknown[] | undefined)?.length,
    ).toBe(0);
    expect(result.signals.phoneNumber).toBe(0);
  });

  it("recognizes spelled-out and spaced-out phone numbers", async () => {
    store.get.mockResolvedValue(null);

    const spelled = await engine.computeSpamScore(
      "call zero seven one two three four five six seven eight",
      { userId: "user-12", messagesLast5Min: 0, sameContentConversations: 0 },
    );
    expect(spelled.signals.phoneNumber).toBe(95); // "call" => contact intent
    expect(spelled.score).toBeGreaterThanOrEqual(90);

    const spaced = await engine.computeSpamScore(
      "namba yangu 0 7 1 2 3 4 5 6 7 8 whatsapp",
      { userId: "user-13", messagesLast5Min: 0, sameContentConversations: 0 },
    );
    expect(spaced.signals.phoneNumber).toBe(95);
  });
});
