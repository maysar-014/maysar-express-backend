import {
  resolveSandboxOutcome,
  outcomeToTerminal,
  resolveCompletionDelayMs,
} from "../sandbox-behavior";

describe("resolveSandboxOutcome", () => {
  it("defaults to SUCCESS when no outcome is requested", () => {
    expect(resolveSandboxOutcome(undefined)).toBe("SUCCESS");
    expect(resolveSandboxOutcome({})).toBe("SUCCESS");
    expect(resolveSandboxOutcome({ other: 1 })).toBe("SUCCESS");
  });

  it("resolves an explicit outcome case-insensitively", () => {
    expect(resolveSandboxOutcome({ sandboxOutcome: "DECLINED" })).toBe(
      "DECLINED",
    );
    expect(
      resolveSandboxOutcome({ sandboxOutcome: "insufficient_funds" }),
    ).toBe("INSUFFICIENT_FUNDS");
    expect(resolveSandboxOutcome({ sandboxOutcome: "Timeout" })).toBe(
      "TIMEOUT",
    );
    expect(resolveSandboxOutcome({ sandboxOutcome: "CANCELLED" })).toBe(
      "CANCELLED",
    );
  });

  it("falls back to SUCCESS for an unknown outcome value", () => {
    expect(resolveSandboxOutcome({ sandboxOutcome: "BOGUS" })).toBe("SUCCESS");
  });
});

describe("outcomeToTerminal", () => {
  it("maps every outcome to its terminal status + failure reason", () => {
    expect(outcomeToTerminal("SUCCESS")).toEqual({ status: "COMPLETED" });
    expect(outcomeToTerminal("INSUFFICIENT_FUNDS")).toEqual({
      status: "FAILED",
      failureReason: "PAYMENT_DECLINED: insufficient funds (simulated)",
    });
    expect(outcomeToTerminal("DECLINED")).toEqual({
      status: "FAILED",
      failureReason: "PAYMENT_DECLINED: declined by provider (simulated)",
    });
    expect(outcomeToTerminal("TIMEOUT")).toEqual({
      status: "FAILED",
      failureReason: "PAYMENT_EXPIRED: provider timeout (simulated)",
    });
    expect(outcomeToTerminal("CANCELLED")).toEqual({
      status: "CANCELLED",
    });
  });
});

describe("resolveCompletionDelayMs", () => {
  it("defaults to 2000ms without configuration", () => {
    expect(resolveCompletionDelayMs({})).toBe(2000);
  });

  it("uses the configured value", () => {
    expect(
      resolveCompletionDelayMs({ PAYMENT_SANDBOX_COMPLETION_DELAY_MS: "150" }),
    ).toBe(150);
  });

  it("clamps to the 60s safety maximum", () => {
    expect(
      resolveCompletionDelayMs({
        PAYMENT_SANDBOX_COMPLETION_DELAY_MS: "999999",
      }),
    ).toBe(60_000);
  });

  it("falls back to default for invalid input", () => {
    expect(
      resolveCompletionDelayMs({ PAYMENT_SANDBOX_COMPLETION_DELAY_MS: "abc" }),
    ).toBe(2000);
  });
});
