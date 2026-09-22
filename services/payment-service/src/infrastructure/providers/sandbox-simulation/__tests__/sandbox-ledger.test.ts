import { SandboxLedger } from "../sandbox-ledger";

describe("SandboxLedger", () => {
  const buildInput = (
    overrides: Partial<{ providerReference: string }> = {},
  ) => ({
    providerReference: overrides.providerReference ?? "sbx_tx_1",
    providerTransactionId: "sbxtxn_1",
    methodCode: "MPESA",
    channel: "MPESA",
    amount: 5000,
    currency: "TZS",
  });

  it("creates a transaction in PENDING and moves it to PROCESSING", () => {
    const ledger = new SandboxLedger();
    const tx = ledger.create(buildInput());
    expect(tx.status).toBe("PENDING");
    expect(tx.webhookDeliveries).toBe(0);

    const processing = ledger.markProcessing("sbx_tx_1");
    expect(processing.status).toBe("PROCESSING");
  });

  it("rejects duplicate provider references", () => {
    const ledger = new SandboxLedger();
    ledger.create(buildInput());
    expect(() => ledger.create(buildInput())).toThrow(/Duplicate sandbox/);
  });

  it("returns null for an unknown reference", () => {
    const ledger = new SandboxLedger();
    expect(ledger.get("sbx_unknown")).toBeNull();
  });

  it("terminal states are immutable — a duplicate callback cannot double-process", () => {
    const ledger = new SandboxLedger();
    ledger.create(buildInput());
    ledger.markProcessing("sbx_tx_1");

    const settled = ledger.applyTerminal("sbx_tx_1", "COMPLETED");
    expect(settled.status).toBe("COMPLETED");
    expect(settled.completedAt).toBeDefined();

    // Late FAILED callback must NOT overwrite the terminal COMPLETED state.
    const late = ledger.applyTerminal("sbx_tx_1", "FAILED", "PAYMENT_FAILED");
    expect(late.status).toBe("COMPLETED");
    // No delivery was recorded here — delivery bookkeeping happens in the
    // adapter (recordWebhookDelivery), never inside applyTerminal.
    expect(late.webhookDeliveries).toBe(0);
  });

  it("records inbound webhook deliveries for idempotency bookkeeping", () => {
    const ledger = new SandboxLedger();
    ledger.create(buildInput());
    ledger.recordWebhookDelivery("sbx_tx_1");
    ledger.recordWebhookDelivery("sbx_tx_1");
    expect(ledger.get("sbx_tx_1")!.webhookDeliveries).toBe(2);
  });

  it("captures failure reasons on terminal FAILED", () => {
    const ledger = new SandboxLedger();
    ledger.create(buildInput());
    ledger.markProcessing("sbx_tx_1");
    const tx = ledger.applyTerminal(
      "sbx_tx_1",
      "FAILED",
      "PAYMENT_DECLINED: declined by provider (simulated)",
    );
    expect(tx.status).toBe("FAILED");
    expect(tx.failureReason).toContain("PAYMENT_DECLINED");
  });
});
