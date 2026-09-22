import { SandboxLedger, isSandboxReference } from "../sandbox-ledger";
import { SandboxSimulatorAdapter } from "../sandbox-simulator.adapter";
import { SandboxAwareProviderRouter } from "../sandbox-webhook-router";
import { WebhookPayload } from "../../../../domain/repositories/payment-provider.gateway";

const buildAdapter = (
  ledger: SandboxLedger,
  dispatchWebhook?: (payload: WebhookPayload) => Promise<void>,
) =>
  new SandboxSimulatorAdapter({
    channel: "MPESA",
    methodCode: "MPESA",
    ledger,
    dispatchWebhook,
    env: { PAYMENT_SANDBOX_COMPLETION_DELAY_MS: "0" },
  });

const buildRequest = (overrides: Partial<any> = {}) => ({
  paymentId: "pay_sbx_1",
  amount: 5000,
  currency: "TZS",
  method: "MPESA",
  customerInfo: { userId: "user-1" },
  ...overrides,
});

describe("SandboxSimulatorAdapter", () => {
  it("initiates a payment: returns a sandbox reference and processes in ledger", async () => {
    const ledger = new SandboxLedger();
    const adapter = buildAdapter(ledger);
    const response = await adapter.processPayment(buildRequest());

    expect(response.success).toBe(true);
    expect(response.status).toBe("PROCESSING");
    expect(isSandboxReference(response.providerReference!)).toBe(true);
    expect(response.metadata?.simulated).toBe(true);

    const tx = ledger.get(response.providerReference!);
    expect(tx).not.toBeNull();
    expect(tx!.status).toBe("PROCESSING");
    expect(tx!.amount).toBe(5000);
  });

  it("rejects a non-positive amount before creating any transaction", async () => {
    const ledger = new SandboxLedger();
    const adapter = buildAdapter(ledger);
    const response = await adapter.processPayment(buildRequest({ amount: 0 }));
    expect(response.success).toBe(false);
    expect(response.status).toBe("FAILED");
  });

  it("checkPaymentStatus resolves against the ledger", async () => {
    const ledger = new SandboxLedger();
    const adapter = buildAdapter(ledger);
    const initiated = await adapter.processPayment(buildRequest());
    const status = await adapter.checkPaymentStatus(
      initiated.providerReference!,
    );
    expect(status.status).toBe("PROCESSING");
  });

  it("never fabricates a status for an unknown reference", async () => {
    const ledger = new SandboxLedger();
    const adapter = buildAdapter(ledger);
    const status = await adapter.checkPaymentStatus("sbx_unknown_1");
    expect(status.status).toBe("FAILED");
    expect(status.failureReason).toContain("PAYMENT_VERIFICATION_FAILED");
  });

  it("handles a COMPLETED webhook and is idempotent on repetition", async () => {
    const ledger = new SandboxLedger();
    // Long delay so the auto-completion timer can never interleave with the
    // explicit webhook deliveries under test.
    const adapter = new SandboxSimulatorAdapter({
      channel: "MPESA",
      methodCode: "MPESA",
      ledger,
      env: { PAYMENT_SANDBOX_COMPLETION_DELAY_MS: "60000" },
    });
    const initiated = await adapter.processPayment(buildRequest());
    const ref = initiated.providerReference!;

    await adapter.handleWebhook({
      eventType: "payment.status.update",
      providerReference: ref,
      status: "COMPLETED",
      timestamp: new Date(),
    });
    expect(ledger.get(ref)!.status).toBe("COMPLETED");

    // Duplicate callback: still COMPLETED, delivery recorded.
    await adapter.handleWebhook({
      eventType: "payment.status.update",
      providerReference: ref,
      status: "COMPLETED",
      timestamp: new Date(),
    });
    const tx = ledger.get(ref)!;
    expect(tx.status).toBe("COMPLETED");
    expect(tx.webhookDeliveries).toBe(2);
  });

  it("delivers a webhook through the real pipeline on SUCCESS", async () => {
    const ledger = new SandboxLedger();
    const dispatchWebhook = jest.fn().mockResolvedValue(undefined);
    const adapter = buildAdapter(ledger, dispatchWebhook);

    const initiated = await adapter.processPayment(buildRequest());
    await new Promise((resolve) => setTimeout(resolve, 25));

    const dispatched = dispatchWebhook.mock.calls[0][0];
    expect(dispatched.providerReference).toBe(initiated.providerReference);
    expect(dispatched.status).toBe("COMPLETED");
    expect(dispatched.metadata?.simulated).toBe(true);
  });

  it("drives a DECLINED outcome to terminal FAILED through the lifecycle", async () => {
    const ledger = new SandboxLedger();
    const dispatchWebhook = jest.fn().mockResolvedValue(undefined);
    const adapter = buildAdapter(ledger, dispatchWebhook);

    const initiated = await adapter.processPayment(
      buildRequest({ metadata: { sandboxOutcome: "DECLINED" } }),
    );
    const ref = initiated.providerReference!;
    await new Promise((resolve) => setTimeout(resolve, 25));

    const tx = ledger.get(ref)!;
    expect(tx.status).toBe("FAILED");
    expect(tx.failureReason).toContain("PAYMENT_DECLINED");

    const dispatched = dispatchWebhook.mock.calls[0][0];
    expect(dispatched.status).toBe("FAILED");
  });
});

describe("SandboxAwareProviderRouter", () => {
  it("verifies sandbox references against the ledger and live references against the real provider", async () => {
    const ledger = new SandboxLedger();
    const liveProvider = {
      checkPaymentStatus: jest.fn(async (ref: string) => ({
        paymentId: ref,
        providerReference: ref,
        status: "COMPLETED",
        amount: 100,
        currency: "TZS",
      })),
    };
    const router = new SandboxAwareProviderRouter(ledger, liveProvider as any);

    // Live reference → real gateway
    await router.checkPaymentStatus("LIVE123");
    expect(liveProvider.checkPaymentStatus).toHaveBeenCalledWith("LIVE123");

    // Sandbox reference → ledger (unknown → verification failure, no network)
    const status = await router.checkPaymentStatus("sbx_missing_1");
    expect(status.status).toBe("FAILED");
    expect(liveProvider.checkPaymentStatus).toHaveBeenCalledTimes(1);
  });

  it("does not initiate payments directly", async () => {
    const router = new SandboxAwareProviderRouter(
      new SandboxLedger(),
      {} as any,
    );
    await expect(router.processPayment(buildRequest())).rejects.toThrow(
      /does not initiate payments/,
    );
  });
});
