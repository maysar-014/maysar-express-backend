import { InternalWalletAdapter } from "../internal-wallet.adapter";
import { InternalBankTransferAdapter } from "../internal-bank-transfer.adapter";

describe("InternalWalletAdapter", () => {
  const requestBase = {
    paymentId: "pay_1",
    amount: 5000,
    currency: "TZS",
    method: "WALLET",
    customerInfo: { userId: "user-1" },
  };

  it("returns a completed internal payment when no wallet client is available", async () => {
    const adapter = new InternalWalletAdapter();
    const result = await adapter.processPayment(requestBase);

    expect(result.success).toBe(true);
    expect(result.status).toBe("COMPLETED");
    expect(result.providerReference).toBe("wallet_pay_1");
    expect(result.metadata?.provider).toBe("internal-wallet");
  });

  it("debits the wallet through the wallet client when provided", async () => {
    const walletMock = {
      checkEligibility: jest.fn().mockResolvedValue({ canPayout: true }),
      freezeFunds: jest.fn().mockResolvedValue(undefined),
      debitFrozenFunds: jest.fn().mockResolvedValue(undefined),
      unfreezeFunds: jest.fn().mockResolvedValue(undefined),
    };
    const adapter = new InternalWalletAdapter(walletMock);
    const result = await adapter.processPayment(requestBase);

    expect(result.success).toBe(true);
    expect(result.status).toBe("COMPLETED");
    expect(walletMock.freezeFunds).toHaveBeenCalledWith({
      userId: "user-1",
      amount: 5000,
      description: "Payment pay_1",
    });
    expect(walletMock.debitFrozenFunds).toHaveBeenCalled();
  });

  it("rejects with an explicit failure when the wallet cannot cover the amount", async () => {
    const walletMock = {
      checkEligibility: jest
        .fn()
        .mockResolvedValue({
          canPayout: false,
          reason: "Insufficient balance",
        }),
      freezeFunds: jest.fn(),
      debitFrozenFunds: jest.fn(),
      unfreezeFunds: jest.fn(),
    };
    const adapter = new InternalWalletAdapter(walletMock);
    const result = await adapter.processPayment(requestBase);

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    expect(result.message).toContain("Insufficient balance");
    expect(walletMock.freezeFunds).not.toHaveBeenCalled();
  });
});

describe("InternalBankTransferAdapter", () => {
  it("creates a pending bank-transfer instruction at initiation", async () => {
    const adapter = new InternalBankTransferAdapter();
    const result = await adapter.processPayment({
      paymentId: "pay_bt_1",
      amount: 100000,
      currency: "TZS",
      method: "BANK_TRANSFER",
      customerInfo: { userId: "user-1" },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("PROCESSING");
    expect(result.providerReference).toBe("bank_pay_bt_1");
  });

  it("reports pending status until reconciliation confirms the transfer", async () => {
    const adapter = new InternalBankTransferAdapter();
    const status = await adapter.checkPaymentStatus("bank_pay_bt_1");

    expect(status.status).toBe("PENDING");
  });
});
