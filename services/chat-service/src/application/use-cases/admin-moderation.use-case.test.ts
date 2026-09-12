import { AdminModerationUseCase } from "./admin-moderation.use-case";

describe("AdminModerationUseCase (flagged/blocked message oversight)", () => {
  const buildDeps = () => {
    const moderationRepo = {
      listModeratedMessages: jest.fn(),
      listReportsForMessage: jest.fn(),
      listSpamScoreLogs: jest.fn(),
      listAdminActions: jest.fn(),
      createAdminAction: jest.fn(),
      findSuspiciousPhraseById: jest.fn(),
      logSpamScore: jest.fn(),
    };
    const messageRepo = {
      findById: jest.fn(),
      setModerationDecision: jest.fn(),
      softDelete: jest.fn(),
      updateModerationStatus: jest.fn(),
    };
    return { moderationRepo, messageRepo };
  };

  const messageRow = {
    id: "msg-9",
    conversationId: "conv-1",
    senderId: "user-2",
    type: "TEXT" as const,
    content: "tuma kwa m-pesa",
    metadata: {},
    moderationStatus: "BLOCKED" as const,
    moderationReason:
      "Your message was not delivered because our safety system identified: Request to pay via M-Pesa outside the platform.",
    moderationSignals: {
      score: 100,
      matchedPatterns: [{ phrase: "tuma kwa m-pesa", action: "BLOCK" }],
    },
    spamScore: 100,
    isDisputeEvidence: false,
    deletedAt: null,
    createdAt: new Date("2026-09-10T00:00:00Z"),
  };

  it("lists flagged and blocked messages with filters", async () => {
    const deps = buildDeps();
    deps.moderationRepo.listModeratedMessages.mockResolvedValueOnce({
      messages: [{ ...messageRow, moderationSignals: null }],
      nextCursor: "2026-09-09T00:00:00.000Z",
      total: 1,
    });
    const useCase = new AdminModerationUseCase(
      deps.moderationRepo as never,
      deps.messageRepo as never,
    );

    const page = await useCase.listMessages({
      status: "BLOCKED",
      search: "m-pesa",
      limit: 10,
    });

    expect(deps.moderationRepo.listModeratedMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: ["BLOCKED"],
        search: "m-pesa",
        limit: 10,
      }),
    );
    expect(page.messages[0].moderationStatus).toBe("BLOCKED");
    expect(page.total).toBe(1);
  });

  it("returns full review context (reports, spam logs, prior actions) for a message", async () => {
    const deps = buildDeps();
    deps.messageRepo.findById.mockResolvedValueOnce(messageRow);
    deps.moderationRepo.listReportsForMessage.mockResolvedValueOnce([
      {
        id: "rep-1",
        reporterId: "user-3",
        messageId: "msg-9",
        conversationId: "conv-1",
        reason: "scam attempt",
        reportedAt: new Date(),
      },
    ]);
    deps.moderationRepo.listSpamScoreLogs.mockResolvedValueOnce([
      {
        id: "log-1",
        messageId: "msg-9",
        score: 100,
        signals: {},
        computedAt: new Date(),
      },
    ]);
    deps.moderationRepo.listAdminActions.mockResolvedValueOnce([]);
    const useCase = new AdminModerationUseCase(
      deps.moderationRepo as never,
      deps.messageRepo as never,
    );

    const detail = await useCase.getMessageDetail("msg-9");

    expect(detail.message.moderationReason).toContain(
      "M-Pesa outside the platform",
    );
    expect(detail.reports).toHaveLength(1);
    expect(detail.spamLogs).toHaveLength(1);
  });

  it("APPROVE restores the message and records the admin action", async () => {
    const deps = buildDeps();
    deps.messageRepo.findById
      .mockResolvedValueOnce(messageRow)
      .mockResolvedValueOnce({
        ...messageRow,
        moderationStatus: "ACTIVE",
        moderationReason: null,
      });
    deps.moderationRepo.listReportsForMessage.mockResolvedValue([]);
    deps.moderationRepo.listSpamScoreLogs.mockResolvedValue([]);
    deps.moderationRepo.listAdminActions.mockResolvedValue([]);
    deps.moderationRepo.createAdminAction.mockResolvedValue({
      id: "act-1",
      messageId: "msg-9",
      adminId: "admin-1",
      action: "APPROVE",
      notes: "false positive",
      createdAt: new Date(),
    });
    const useCase = new AdminModerationUseCase(
      deps.moderationRepo as never,
      deps.messageRepo as never,
    );

    await useCase.reviewMessage(
      "admin-1",
      "msg-9",
      "APPROVE",
      "false positive",
    );

    expect(deps.messageRepo.setModerationDecision).toHaveBeenCalledWith(
      "msg-9",
      "ACTIVE",
      null,
    );
    expect(deps.moderationRepo.createAdminAction).toHaveBeenCalledWith(
      "msg-9",
      "admin-1",
      "APPROVE",
      "false positive",
    );
  });

  it("DELETE removes the message and keeps it blocked with an admin reason", async () => {
    const deps = buildDeps();
    deps.messageRepo.findById.mockResolvedValue(messageRow);
    deps.moderationRepo.listReportsForMessage.mockResolvedValue([]);
    deps.moderationRepo.listSpamScoreLogs.mockResolvedValue([]);
    deps.moderationRepo.listAdminActions.mockResolvedValue([]);
    deps.moderationRepo.createAdminAction.mockResolvedValue({
      id: "act-2",
      messageId: "msg-9",
      adminId: "admin-1",
      action: "DELETE",
      notes: null,
      createdAt: new Date(),
    });
    const useCase = new AdminModerationUseCase(
      deps.moderationRepo as never,
      deps.messageRepo as never,
    );

    await useCase.reviewMessage("admin-1", "msg-9", "DELETE", null);

    expect(deps.messageRepo.softDelete).toHaveBeenCalledWith("msg-9");
    expect(deps.messageRepo.setModerationDecision).toHaveBeenCalledWith(
      "msg-9",
      "BLOCKED",
      expect.stringContaining("removed by an administrator"),
    );
  });

  it("rejects unknown review actions", async () => {
    const deps = buildDeps();
    const useCase = new AdminModerationUseCase(
      deps.moderationRepo as never,
      deps.messageRepo as never,
    );

    await expect(
      useCase.reviewMessage("admin-1", "msg-9", "ESCALATE" as never, null),
    ).rejects.toThrow(/action must be one of/);
  });
});
