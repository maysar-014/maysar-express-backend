import { SelcomPesaAdapter } from "../selcom-pesa.adapter";

describe("SelcomPesaAdapter", () => {
  it("returns a disabled response for live payments without credentials", async () => {
    const adapter = new SelcomPesaAdapter();

    const result = await adapter.processPayment({
      paymentId: "payment-1",
      amount: 1000,
      currency: "TZS",
      method: "CARD",
      customerInfo: {
        userId: "user-1",
        email: "buyer@example.com",
        phoneNumber: "+255700000001",
        name: "Buyer One",
      },
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("FAILED");
    // Without channel credentials the adapter must refuse to process.
    expect(result.message).toContain("not configured");
  });

  it("returns a contract-test response without calling external APIs", async () => {
    const adapter = new SelcomPesaAdapter();

    const result = await adapter.processPayment({
      paymentId: "payment-contract-1",
      amount: 1000,
      currency: "TZS",
      method: "CARD",
      customerInfo: {
        userId: "user-1",
        email: "buyer@example.com",
        phoneNumber: "+255700000001",
        name: "Buyer One",
      },
      metadata: { contractTest: true },
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("PROCESSING");
    expect(result.redirectUrl).toContain("selcom.example");
  });

  it("reports unknown payment status while disabled", async () => {
    const adapter = new SelcomPesaAdapter();

    const result = await adapter.checkPaymentStatus("tx-1");

    expect(result.status).toBe("UNKNOWN");
  });

  it("uses a channel-scoped provider name when configured for a method", () => {
    const adapter = new SelcomPesaAdapter({
      providerChannel: "MPESA",
      environment: "LIVE",
    });
    expect(adapter.getProviderName()).toBe("selcom-pesa:mpesa");
  });
});
