const mockWalletRepository = {
  findByUserId: jest.fn(),
  update: jest.fn(),
};
const mockTransactionRepository = {
  save: jest.fn(),
};
const mockFreezeUseCase = {
  execute: jest.fn(),
};
const mockUnfreezeUseCase = {
  execute: jest.fn(),
};
const mockCreditUseCase = {
  execute: jest.fn(),
};

jest.mock("../../../../wallet-service/src/container", () => ({
  Container: {
    getInstance: () => ({
      walletRepository: mockWalletRepository,
      transactionRepository: mockTransactionRepository,
      freezeUseCase: mockFreezeUseCase,
      unfreezeUseCase: mockUnfreezeUseCase,
      creditUseCase: mockCreditUseCase,
    }),
  },
}));

import { WalletServiceClient as PaymentWalletServiceClient } from "./wallet-service.client";

describe("wallet-service client contracts", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it("calls payment wallet-service adapter in-process", async () => {
    const wallet = {
      id: "w1",
      balance: 100,
      frozenAmount: 20,
      status: "ACTIVE",
      currency: "TZS",
      debitFrozen: jest.fn(function (amount: number) {
        this.frozenAmount -= amount;
        this.balance -= amount;
      }),
    };
    mockWalletRepository.findByUserId.mockResolvedValue(wallet);
    mockFreezeUseCase.execute.mockResolvedValue({ success: true });
    mockUnfreezeUseCase.execute.mockResolvedValue({ success: true });
    mockCreditUseCase.execute.mockResolvedValue({ success: true });

    const client = new PaymentWalletServiceClient();

    await expect(client.getBalance("user-1")).resolves.toEqual({
      balance: 100,
      availableBalance: 80,
    });
    await expect(client.checkEligibility("user-1", 25)).resolves.toEqual({
      canPayout: true,
    });
    await client.freezeFunds({
      userId: "user-1",
      amount: 10,
      description: "freeze",
    });
    await client.unfreezeFunds({
      userId: "user-1",
      amount: 10,
      description: "unfreeze",
    });
    await client.debitFrozenFunds({
      userId: "user-1",
      amount: 10,
      description: "debit",
    });

    expect(mockFreezeUseCase.execute).toHaveBeenCalled();
    expect(mockUnfreezeUseCase.execute).toHaveBeenCalled();
    expect(mockTransactionRepository.save).toHaveBeenCalled();
  });

  it("loads order-service wallet client and executes hold lifecycle methods over HTTP", async () => {
    // The order-service WalletServiceClient is a live HTTP client (real fetch calls
    // to the wallet API). Mock global fetch and assert the actual request contract.
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const fetchMock = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const orderModule =
        await import("../../../../order-service/src/infrastructure/integrations/wallet-service.client");
      const client = new orderModule.WalletServiceClient();

      // ── placeHold ──────────────────────────────────────────────────────────
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ holdId: "hold_abc123" }),
      });
      const holdId = await client.placeHold("user-2", 50, "TZS", "cod");
      expect(holdId).toBe("hold_abc123");

      const [placeUrl, placeInit] = fetchMock.mock.calls[0];
      expect(placeUrl).toContain("/api/wallet/wallets/user-2/hold");
      expect(placeInit.method).toBe("POST");
      expect(placeInit.headers["Authorization"]).toMatch(/^Bearer /);
      expect(placeInit.headers["idempotency-key"]).toMatch(/^wallet-/);
      const placeBody = JSON.parse(placeInit.body);
      expect(placeBody).toMatchObject({
        userId: "user-2",
        amount: 50,
        currency: "TZS",
        reason: "cod",
      });
      expect(placeBody.idempotencyKey).toMatch(/^hold-user-2-/);
      expect(placeBody.correlationId).toBeDefined();

      // ── releaseHold ────────────────────────────────────────────────────────
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      await client.releaseHold(holdId);
      const [releaseUrl, releaseInit] = fetchMock.mock.calls[1];
      expect(releaseUrl).toContain(
        `/api/wallet/wallets/holds/${holdId}/release`,
      );
      expect(releaseInit.method).toBe("POST");
      expect(releaseInit.headers["Authorization"]).toMatch(/^Bearer /);

      // ── captureHold ────────────────────────────────────────────────────────
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      await client.captureHold(holdId);
      const [captureUrl] = fetchMock.mock.calls[2];
      expect(captureUrl).toContain(
        `/api/wallet/wallets/holds/${holdId}/capture`,
      );

      // Success paths must not emit error/log noise.
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
