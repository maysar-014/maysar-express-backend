import { SendMessageUseCase } from "./send-message.use-case";

const makeErrorName = (error: unknown): string =>
  (error as Error)?.name ?? "Error";
const makeErrorMessage = (error: unknown): string =>
  (error as Error)?.message ?? "";

describe("SendMessageUseCase", () => {
  const createDependencies = () => {
    const conversationRepo = {
      isParticipant: jest.fn(),
      findById: jest.fn(),
      getParticipants: jest.fn(),
      updateLastMessageAt: jest.fn(),
    };
    const messageRepo = {
      create: jest.fn(),
    };
    const moderationRepo = {
      isBlocked: jest.fn().mockResolvedValue(false),
      logSpamScore: jest.fn().mockResolvedValue(undefined),
      incrementSuspiciousPhraseMatches: jest.fn().mockResolvedValue(undefined),
    };
    const rateLimiter = {
      checkMessageLimit: jest.fn(),
    };
    const pubSub = {
      publish: jest.fn(),
    };
    const riskEngine = {
      getMessagesLast5Min: jest.fn(),
      getSameContentConversationCount: jest.fn(),
      computeSpamScore: jest.fn(),
      incrementMessageFrequency: jest.fn(),
      recordMessageSent: jest.fn(),
    };
    const catalogClient = {
      getProductSnapshot: jest.fn(),
    };
    const orderClient = {
      getOrderSnapshot: jest.fn(),
    };
    const notifyOffline = jest.fn().mockResolvedValue(undefined);

    return {
      conversationRepo,
      messageRepo,
      moderationRepo,
      rateLimiter,
      pubSub,
      riskEngine,
      catalogClient,
      orderClient,
      notifyOffline,
    };
  };

  it("creates a text message and publishes it when allowed", async () => {
    const deps = createDependencies();
    const useCase = new SendMessageUseCase(
      deps.conversationRepo as never,
      deps.messageRepo as never,
      deps.moderationRepo as never,
      deps.rateLimiter as never,
      deps.pubSub as never,
      deps.riskEngine as never,
      deps.catalogClient as never,
      deps.orderClient as never,
      deps.notifyOffline as never,
    );

    deps.conversationRepo.isParticipant.mockResolvedValueOnce(true);
    deps.conversationRepo.findById.mockResolvedValueOnce({
      moderationStatus: "ACTIVE",
    });
    deps.conversationRepo.getParticipants.mockResolvedValueOnce([
      { userId: "sender-1" },
      { userId: "recipient-1" },
    ]);
    deps.rateLimiter.checkMessageLimit.mockResolvedValueOnce({ allowed: true });
    deps.moderationRepo.isBlocked.mockResolvedValueOnce(false);
    deps.riskEngine.getMessagesLast5Min.mockResolvedValueOnce(1);
    deps.riskEngine.getSameContentConversationCount.mockResolvedValueOnce(0);
    deps.riskEngine.computeSpamScore.mockResolvedValueOnce({
      score: 10,
      signals: { rate: 1 },
    });
    deps.messageRepo.create.mockResolvedValueOnce({
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "sender-1",
      type: "TEXT",
      content: "hello",
      metadata: {},
      moderationStatus: "ACTIVE",
      spamScore: 10,
      createdAt: new Date("2026-05-01T00:00:00.000Z"),
    });

    const message = await useCase.execute({
      conversationId: "conv-1",
      senderId: "sender-1",
      type: "TEXT",
      content: "hello",
    });

    expect(message.id).toBe("msg-1");
    expect(deps.messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv-1",
        senderId: "sender-1",
        moderationStatus: "ACTIVE",
        spamScore: 10,
      }),
    );
    expect(deps.pubSub.publish).toHaveBeenCalledWith("conv-1", {
      type: "message",
      data: expect.objectContaining({ id: "msg-1" }),
    });
    expect(deps.notifyOffline).toHaveBeenCalled();
  });

  it("blocks invalid or unauthorized messages early", async () => {
    const deps = createDependencies();
    const useCase = new SendMessageUseCase(
      deps.conversationRepo as never,
      deps.messageRepo as never,
      deps.moderationRepo as never,
      deps.rateLimiter as never,
      deps.pubSub as never,
      deps.riskEngine as never,
      deps.catalogClient as never,
      deps.orderClient as never,
      deps.notifyOffline as never,
    );

    deps.conversationRepo.isParticipant.mockResolvedValueOnce(false);
    await expect(
      useCase.execute({
        conversationId: "conv-1",
        senderId: "sender-1",
        type: "TEXT",
        content: "hello",
      }),
    ).rejects.toThrow(/Access denied/);

    deps.conversationRepo.isParticipant.mockResolvedValueOnce(true);
    deps.conversationRepo.findById.mockResolvedValueOnce({
      moderationStatus: "ARCHIVED",
    });
    await expect(
      useCase.execute({
        conversationId: "conv-1",
        senderId: "sender-1",
        type: "TEXT",
        content: "hello",
      }),
    ).rejects.toThrow(/archived/i);

    deps.conversationRepo.findById.mockResolvedValueOnce({
      moderationStatus: "ACTIVE",
    });
    deps.conversationRepo.isParticipant.mockResolvedValueOnce(true);
    deps.conversationRepo.getParticipants.mockResolvedValueOnce([
      { userId: "sender-1" },
      { userId: "recipient-1" },
    ]);
    deps.rateLimiter.checkMessageLimit.mockResolvedValueOnce({
      allowed: false,
    });
    await expect(
      useCase.execute({
        conversationId: "conv-1",
        senderId: "sender-1",
        type: "TEXT",
        content: "hello",
      }),
    ).rejects.toThrow(/rate/i);
  });
});
