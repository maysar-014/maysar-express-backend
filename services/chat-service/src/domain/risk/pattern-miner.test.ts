import { EmergingPatternMiner } from "./pattern-miner";

describe("EmergingPatternMiner (dynamic detection beyond the predefined list)", () => {
  const buildPrisma = () => ({
    chat_Message: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "msg-1",
          content: "tuma dew ya kufungua mzigo ofisini",
          conversationId: "conv-1",
        },
        {
          id: "msg-2",
          content: "kufungua mzigo kabla ya delivery",
          conversationId: "conv-2",
        },
        {
          id: "msg-3",
          content: "baada ya kufungua mzigo nitumie pesa",
          conversationId: "conv-3",
        },
        {
          id: "msg-4",
          content: "hello is the item available",
          conversationId: "conv-1",
        },
      ]),
    },
    chat_EmergingPattern: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "pat-1",
          phrase: "kufungua mzigo",
          occurrences: 3,
          conversationCount: 3,
          sampleMessageIds: ["msg-1"],
          status: "PENDING",
          firstSeenAt: new Date("2026-09-01T00:00:00Z"),
          lastSeenAt: new Date("2026-09-10T00:00:00Z"),
        },
      ]),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    chat_SuspiciousPhrase: {
      upsert: jest.fn(),
    },
  });

  it("mines recurring n-grams across conversations and records pending patterns", async () => {
    const prisma = buildPrisma();
    const miner = new EmergingPatternMiner(prisma as never);

    const scanned = await miner.run();

    expect(scanned).toBe(4);
    expect(prisma.chat_EmergingPattern.upsert).toHaveBeenCalled();

    const upserted = prisma.chat_EmergingPattern.upsert.mock.calls.map(
      (call: unknown[]) =>
        (call[0] as { where: { phrase: string } }).where.phrase,
    );
    // Recursing phrase observed in 3 different conversations qualifies;
    // stopwords and single-message content never qualify.
    expect(upserted).toContain("kufungua mzigo");
    expect(upserted).not.toContain("hello item");
  });

  it("promotes a pending pattern into an active AUTO-sourced phrase", async () => {
    const prisma = buildPrisma();
    prisma.chat_EmergingPattern.findUnique.mockResolvedValue({
      id: "pat-1",
      phrase: "kufungua mzigo",
      occurrences: 5,
      conversationCount: 4,
      sampleMessageIds: ["msg-1"],
      status: "PENDING",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    prisma.chat_EmergingPattern.update.mockResolvedValue({
      id: "pat-1",
      phrase: "kufungua mzigo",
      occurrences: 5,
      conversationCount: 4,
      sampleMessageIds: ["msg-1"],
      status: "PROMOTED",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    const miner = new EmergingPatternMiner(prisma as never);

    const promoted = await miner.promote("pat-1", { action: "BLOCK" });

    expect(promoted?.status).toBe("PROMOTED");
    expect(prisma.chat_SuspiciousPhrase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phrase: "kufungua mzigo" },
        update: expect.objectContaining({
          action: "BLOCK",
          source: "AUTO",
          isActive: true,
        }),
      }),
    );
  });

  it("dismisses pending patterns so admins can clear false positives", async () => {
    const prisma = buildPrisma();
    prisma.chat_EmergingPattern.findUnique.mockResolvedValue({
      id: "pat-1",
      phrase: "false positive",
      occurrences: 3,
      conversationCount: 2,
      sampleMessageIds: [],
      status: "PENDING",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    prisma.chat_EmergingPattern.update.mockResolvedValue({
      id: "pat-1",
      phrase: "false positive",
      occurrences: 3,
      conversationCount: 2,
      sampleMessageIds: [],
      status: "DISMISSED",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    const miner = new EmergingPatternMiner(prisma as never);

    const dismissed = await miner.dismiss("pat-1");

    expect(dismissed?.status).toBe("DISMISSED");
    expect(prisma.chat_SuspiciousPhrase.upsert).not.toHaveBeenCalled();
  });
});
