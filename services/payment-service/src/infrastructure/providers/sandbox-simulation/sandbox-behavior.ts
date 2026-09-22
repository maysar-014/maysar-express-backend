/**
 * Sandbox behavior control.
 *
 * Determines how a simulated transaction resolves. Outcomes are explicit and
 * deterministic (driven by the initiation request), never random — so
 * integration tests can exercise SUCCESS, declines, timeouts and cancellations
 * through the SAME production-like lifecycle.
 */

export type SandboxOutcome =
  | "SUCCESS"
  | "INSUFFICIENT_FUNDS"
  | "DECLINED"
  | "TIMEOUT"
  | "CANCELLED";

const OUTCOMES: ReadonlySet<string> = new Set<string>([
  "SUCCESS",
  "INSUFFICIENT_FUNDS",
  "DECLINED",
  "TIMEOUT",
  "CANCELLED",
]);

/** Default delay before a simulated transaction reaches its terminal state. */
const DEFAULT_COMPLETION_DELAY_MS = 2000;
const MAX_COMPLETION_DELAY_MS = 60_000;

export function resolveSandboxOutcome(
  metadata?: Record<string, unknown>,
): SandboxOutcome {
  const raw =
    metadata && typeof metadata.sandboxOutcome === "string"
      ? metadata.sandboxOutcome.toUpperCase()
      : "SUCCESS";
  return (OUTCOMES.has(raw) ? raw : "SUCCESS") as SandboxOutcome;
}

/** Maps a sandbox outcome to the terminal status + provider failure reason. */
export function outcomeToTerminal(outcome: SandboxOutcome): {
  status: "COMPLETED" | "FAILED" | "CANCELLED";
  failureReason?: string;
} {
  switch (outcome) {
    case "SUCCESS":
      return { status: "COMPLETED" };
    case "INSUFFICIENT_FUNDS":
      return {
        status: "FAILED",
        failureReason: "PAYMENT_DECLINED: insufficient funds (simulated)",
      };
    case "DECLINED":
      return {
        status: "FAILED",
        failureReason: "PAYMENT_DECLINED: declined by provider (simulated)",
      };
    case "TIMEOUT":
      return {
        status: "FAILED",
        failureReason: "PAYMENT_EXPIRED: provider timeout (simulated)",
      };
    case "CANCELLED":
      return { status: "CANCELLED" };
  }
}

/** Completion delay from env, clamped to a sane range. */
export function resolveCompletionDelayMs(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): number {
  const parsed = parseInt(env.PAYMENT_SANDBOX_COMPLETION_DELAY_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_COMPLETION_DELAY_MS;
  }
  return Math.min(parsed, MAX_COMPLETION_DELAY_MS);
}
