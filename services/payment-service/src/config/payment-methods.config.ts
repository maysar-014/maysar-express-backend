/**
 * Payment Method Configuration & Environment Control
 *
 * Establishes per-method environment control (sandbox | live | off) for every
 * supported payment method, with provider-scoped credentials per environment.
 *
 * Design rules enforced here:
 *  - Each payment method is an independently configurable channel.
 *  - Mode is environment-driven (PAYMENT_<METHOD>_MODE) — never hard-coded.
 *  - `live` mode strictly requires live credentials for the method's provider;
 *    it never falls back to sandbox/development credentials.
 *  - `sandbox` mode requires sandbox credentials for the method's provider.
 *  - `off` means operationally unavailable: rejected by the backend, hidden
 *    from buyers, and no transactions can be initiated.
 *  - Secrets never leave this module: discovery/admin payloads contain only
 *    safe metadata (never keys, secrets, or full connection details).
 */

export type PaymentMethodType =
  | "mobile_money"
  | "card"
  | "bank_transfer"
  | "wallet";

export type PaymentMode = "sandbox" | "live" | "off";

export type PaymentEnvironment = "SANDBOX" | "LIVE";

/** The exact set of supported payment methods (no generic mobile_money). */
export const PAYMENT_METHOD_CODES = [
  "MPESA",
  "AIRTEL_MONEY",
  "MIXX_BY_YAS",
  "HALOPESA",
  "CARD",
  "BANK_TRANSFER",
  "WALLET",
] as const;

export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

/** Provider that actually processes a method's transactions. */
export type PaymentProviderKey =
  | "selcom"
  | "internal_wallet"
  | "internal_bank_transfer";

interface PaymentMethodDefinition {
  code: PaymentMethodCode;
  name: string;
  type: PaymentMethodType;
  provider: PaymentProviderKey;
  envPrefix: string;
  providerChannel: string;
  minimumAmount: number;
}

// ── METHOD_DEFS ──
export const PAYMENT_METHODS: Readonly<
  Record<PaymentMethodCode, PaymentMethodDefinition>
> = {
  MPESA: {
    code: "MPESA",
    name: "M-Pesa",
    type: "mobile_money",
    provider: "selcom",
    envPrefix: "PAYMENT_MPESA",
    providerChannel: "MPESA",
    minimumAmount: 500,
  },
  AIRTEL_MONEY: {
    code: "AIRTEL_MONEY",
    name: "Airtel Money",
    type: "mobile_money",
    provider: "selcom",
    envPrefix: "PAYMENT_AIRTEL_MONEY",
    providerChannel: "AIRTEL_MONEY",
    minimumAmount: 500,
  },
  MIXX_BY_YAS: {
    code: "MIXX_BY_YAS",
    name: "Mixx by Yas",
    type: "mobile_money",
    provider: "selcom",
    envPrefix: "PAYMENT_MIXX_BY_YAS",
    providerChannel: "MIXX_BY_YAS",
    minimumAmount: 500,
  },
  HALOPESA: {
    code: "HALOPESA",
    name: "HaloPesa",
    type: "mobile_money",
    provider: "selcom",
    envPrefix: "PAYMENT_HALOPESA",
    providerChannel: "HALOPESA",
    minimumAmount: 500,
  },
  CARD: {
    code: "CARD",
    name: "Card",
    type: "card",
    provider: "selcom",
    envPrefix: "PAYMENT_CARD",
    providerChannel: "CARD",
    minimumAmount: 1000,
  },
  BANK_TRANSFER: {
    code: "BANK_TRANSFER",
    name: "Bank Transfer",
    type: "bank_transfer",
    provider: "internal_bank_transfer",
    envPrefix: "PAYMENT_BANK_TRANSFER",
    providerChannel: "BANK_TRANSFER",
    minimumAmount: 1000,
  },
  WALLET: {
    code: "WALLET",
    name: "Wallet",
    type: "wallet",
    provider: "internal_wallet",
    envPrefix: "PAYMENT_WALLET",
    providerChannel: "WALLET",
    minimumAmount: 100,
  },
};

/** Deprecated aliases from before the Tigo Pesa → Mixx by Yas rebrand. */
export const DEPRECATED_METHOD_ALIASES: Record<string, PaymentMethodCode> = {
  TIGO_PESA: "MIXX_BY_YAS",
  MOBILE_MONEY: "MPESA",
  MNO: "MPESA",
};

/** Provider-level credential definitions (keys are the <KEY> part of env vars). */
const PROVIDER_CREDENTIAL_KEYS: Record<PaymentProviderKey, string[]> = {
  selcom: ["API_KEY", "MERCHANT_CODE", "BASE_URL"],
  internal_wallet: [],
  internal_bank_transfer: [],
};

export class PaymentConfigurationError extends Error {
  constructor(
    message: string,
    public readonly methodCode: PaymentMethodCode | "ALL",
    public readonly missingKeys: string[],
    public readonly mode: PaymentMode,
  ) {
    super(message);
    this.name = "PaymentConfigurationError";
  }
}

interface MethodRuntimeState {
  mode: PaymentMode;
  credentials: Record<string, string>;
  missingKeys: string[];
  operational: boolean;
  configurationError: string | null;
  lastValidatedAt: Date;
}

// ── NORMALIZE_FN ──
function normalizeMode(
  raw: string | undefined,
  isProduction: boolean,
): PaymentMode {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "sandbox" || value === "live" || value === "off") {
    return value;
  }
  // Conservative defaults: sandbox for development/testing, fully off in
  // production until an operator explicitly enables the method.
  return isProduction ? "off" : "sandbox";
}

export interface PaymentMethodPublicView {
  code: string;
  name: string;
  type: PaymentMethodType;
  status: PaymentMode;
  available: boolean;
}

export interface PaymentMethodAdminView {
  code: string;
  name: string;
  type: PaymentMethodType;
  provider: PaymentProviderKey;
  environment: PaymentMode;
  operationalStatus: "operational" | "disabled" | "configuration_error";
  configurationStatus: "configured" | "missing_credentials" | "not_required";
  missingKeys: string[];
  /** Presence booleans only — never credential values. */
  credentialsPresent: Record<string, boolean>;
  lastValidatedAt: string;
}

// ── SERVICE_CLASS ──
export class PaymentMethodConfigService {
  private readonly states = new Map<PaymentMethodCode, MethodRuntimeState>();

  constructor(
    private readonly env: Record<
      string,
      string | undefined
    > = process.env as Record<string, string | undefined>,
    private readonly isProduction: boolean = (env.NODE_ENV ?? "development") ===
      "production",
  ) {
    this.buildStates();
  }

  // ── Resolution ──────────────────────────────────────────────────────────────

  /** Resolves deprecated/generic aliases to a canonical method code. */
  normalizeMethodCode(raw: string): PaymentMethodCode | null {
    const value = (raw ?? "").trim().toUpperCase();
    if ((PAYMENT_METHOD_CODES as readonly string[]).includes(value)) {
      return value as PaymentMethodCode;
    }
    return DEPRECATED_METHOD_ALIASES[value] ?? null;
  }

  getMode(code: PaymentMethodCode): PaymentMode {
    return this.states.get(code)?.mode ?? "off";
  }

  /** A method is operational when enabled AND its configuration is complete. */
  isOperational(code: PaymentMethodCode): boolean {
    return this.states.get(code)?.operational ?? false;
  }

  /**
   * Runtime configuration for the method's provider in its active environment.
   * Throws PaymentConfigurationError when the method is not operational —
   * callers must treat that as "do not process".
   */
  getRuntimeConfig(code: PaymentMethodCode): {
    mode: PaymentMode;
    environment: PaymentEnvironment;
    provider: PaymentProviderKey;
    providerChannel: string;
    credentials: Record<string, string>;
  } {
    const definition = PAYMENT_METHODS[code];
    const state = this.states.get(code);
    if (!state || !state.operational) {
      throw new PaymentConfigurationError(
        state?.configurationError ??
          `Payment method ${definition.name} is not operational`,
        code,
        state?.missingKeys ?? [],
        state?.mode ?? "off",
      );
    }
    return {
      mode: state.mode,
      environment: state.mode === "live" ? "LIVE" : "SANDBOX",
      provider: definition.provider,
      providerChannel: definition.providerChannel,
      credentials: { ...state.credentials },
    };
  }

  // ── VIEW_HELPERS ──
  /** Codes of methods that are enabled but misconfigured (startup health). */
  validateAll(): PaymentMethodCode[] {
    const misconfigured: PaymentMethodCode[] = [];
    for (const code of PAYMENT_METHOD_CODES) {
      const state = this.states.get(code)!;
      if (state.mode !== "off" && !state.operational) {
        misconfigured.push(code);
      }
    }
    return misconfigured;
  }

  /** Human-readable per-method startup report (secret-free). */
  formatStartupReport(): string[] {
    const lines: string[] = ["Payment method environment configuration:"];
    for (const code of PAYMENT_METHOD_CODES) {
      const definition = PAYMENT_METHODS[code];
      const state = this.states.get(code)!;
      const status =
        state.mode === "off"
          ? "OFF (disabled)"
          : state.operational
            ? `${state.mode.toUpperCase()} (operational)`
            : `${state.mode.toUpperCase()} (CONFIGURATION ERROR)`;
      lines.push(`  ${definition.name.padEnd(16)} ${status}`);
      if (state.configurationError) {
        lines.push(
          `    └─ Payment configuration error: ${state.configurationError}` +
            (state.missingKeys.length > 0
              ? ` (missing: ${state.missingKeys.join(", ")})`
              : ""),
        );
      }
    }
    return lines;
  }

  /** Buyer-facing discovery payload — only what the client needs. */
  listPublic(): PaymentMethodPublicView[] {
    return (PAYMENT_METHOD_CODES as readonly PaymentMethodCode[]).map(
      (code) => {
        const definition = PAYMENT_METHODS[code];
        const state = this.states.get(code)!;
        return {
          code: code.toLowerCase(),
          name: definition.name,
          type: definition.type,
          status: state.mode,
          available: state.operational,
        };
      },
    );
  }

  listAvailableCodes(): PaymentMethodCode[] {
    return (PAYMENT_METHOD_CODES as readonly PaymentMethodCode[]).filter(
      (code) => this.isOperational(code),
    );
  }

  /** Operations/admin view — configuration state without any secret values. */
  listAdminStatus(): PaymentMethodAdminView[] {
    return (PAYMENT_METHOD_CODES as readonly PaymentMethodCode[]).map(
      (code) => {
        const definition = PAYMENT_METHODS[code];
        const state = this.states.get(code)!;
        const credentialsPresent: Record<string, boolean> = {};
        for (const key of PROVIDER_CREDENTIAL_KEYS[definition.provider]) {
          credentialsPresent[key] = Boolean(state.credentials[key]);
        }
        return {
          code: code.toLowerCase(),
          name: definition.name,
          type: definition.type,
          provider: definition.provider,
          environment: state.mode,
          operationalStatus:
            state.mode === "off"
              ? "disabled"
              : state.operational
                ? "operational"
                : "configuration_error",
          configurationStatus: definition.provider.startsWith("internal")
            ? "not_required"
            : state.missingKeys.length > 0
              ? "missing_credentials"
              : "configured",
          missingKeys: state.missingKeys,
          credentialsPresent,
          lastValidatedAt: state.lastValidatedAt.toISOString(),
        };
      },
    );
  }

  private buildStates(): void {
    for (const code of PAYMENT_METHOD_CODES) {
      this.states.set(code, this.buildState(code));
    }
  }

  private buildState(code: PaymentMethodCode): MethodRuntimeState {
    const definition = PAYMENT_METHODS[code];
    const rawMode = this.env[`${definition.envPrefix}_MODE`];
    const mode = normalizeMode(rawMode, this.isProduction);

    const state: MethodRuntimeState = {
      mode,
      credentials: {},
      missingKeys: [],
      operational: false,
      configurationError: null,
      lastValidatedAt: new Date(),
    };

    if (mode === "off") {
      // OFF — credentials are not required for operation.
      state.operational = false;
      return state;
    }

    const environment = mode === "live" ? "LIVE" : "SANDBOX";
    const requiredKeys = PROVIDER_CREDENTIAL_KEYS[definition.provider];

    for (const key of requiredKeys) {
      const scopedKey = `PAYMENT_${definition.provider.toUpperCase()}_${environment}_${key}`;
      let value = this.env[scopedKey];
      if (
        !value &&
        definition.provider === "selcom" &&
        environment === "SANDBOX"
      ) {
        value = this.env[`SELCOM_PESA_${key}`];
      }
      if (value) {
        state.credentials[key] = value;
      } else {
        state.missingKeys.push(scopedKey);
      }
    }

    if (state.missingKeys.length > 0) {
      state.operational = false;
      state.configurationError =
        `${definition.name} is configured as ${mode.toUpperCase()} but required ` +
        `${environment.toLowerCase()} configuration is missing`;
    } else {
      state.operational = true;
    }

    return state;
  }
}

/** Shared instance for the payment service process. */
let configServiceInstance: PaymentMethodConfigService | null = null;

export function getPaymentMethodConfigService(): PaymentMethodConfigService {
  if (!configServiceInstance) {
    configServiceInstance = new PaymentMethodConfigService();
  }
  return configServiceInstance;
}

/** Test-only reset so each test gets a fresh registry. */
export function resetPaymentMethodConfigService(): void {
  configServiceInstance = null;
}
