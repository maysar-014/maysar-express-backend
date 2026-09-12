import {
  PAYMENT_METHOD_CODES,
  PaymentMethodConfigService,
  PaymentConfigurationError,
  resetPaymentMethodConfigService,
} from "../payment-methods.config";

describe("PaymentMethodConfigService", () => {
  afterEach(() => {
    resetPaymentMethodConfigService();
  });

  describe("environment parsing", () => {
    it("defaults every method to off in production when no mode is configured", () => {
      const service = new PaymentMethodConfigService(
        { NODE_ENV: "production" },
        true,
      );
      for (const code of PAYMENT_METHOD_CODES) {
        expect(service.getMode(code)).toBe("off");
        expect(service.isOperational(code)).toBe(false);
      }
      expect(service.listPublic().every((m) => !m.available)).toBe(true);
    });

    it("defaults to sandbox in non-production when no mode is configured", () => {
      const service = new PaymentMethodConfigService(
        { NODE_ENV: "test" },
        false,
      );
      for (const code of PAYMENT_METHOD_CODES) {
        expect(service.getMode(code)).toBe("sandbox");
      }
    });

    it("parses an explicit mode per method — sandbox, live, and off coexist", () => {
      const env: Record<string, string> = {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
        PAYMENT_AIRTEL_MONEY_MODE: "sandbox",
        PAYMENT_MIXX_BY_YAS_MODE: "off",
        PAYMENT_HALOPESA_MODE: "sandbox",
        PAYMENT_CARD_MODE: "live",
        PAYMENT_BANK_TRANSFER_MODE: "off",
        PAYMENT_WALLET_MODE: "live",
      };
      const service = new PaymentMethodConfigService(env, true);
      expect(service.getMode("MPESA")).toBe("live");
      expect(service.getMode("AIRTEL_MONEY")).toBe("sandbox");
      expect(service.getMode("MIXX_BY_YAS")).toBe("off");
      expect(service.getMode("HALOPESA")).toBe("sandbox");
      expect(service.getMode("CARD")).toBe("live");
      expect(service.getMode("BANK_TRANSFER")).toBe("off");
      expect(service.getMode("WALLET")).toBe("live");
    });
  });

  describe("live mode strictly requires live credentials", () => {
    it("M-Pesa = live without live config is non-operational with a clear error", () => {
      const env: Record<string, string> = {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
      };
      const service = new PaymentMethodConfigService(env, true);

      expect(service.getMode("MPESA")).toBe("live");
      expect(service.isOperational("MPESA")).toBe(false);
      expect(() => service.getRuntimeConfig("MPESA")).toThrow(
        PaymentConfigurationError,
      );
      expect(service.validateAll()).toContain("MPESA");

      const adminView = service
        .listAdminStatus()
        .find((m) => m.code === "mpesa")!;
      expect(adminView.operationalStatus).toBe("configuration_error");
      expect(adminView.configurationStatus).toBe("missing_credentials");
      expect(adminView.environment).toBe("live");
    });

    it("live fallback to sandbox credentials is impossible — sandbox creds do not satisfy live", () => {
      const env: Record<string, string> = {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
        PAYMENT_SELCOM_SANDBOX_API_KEY: "sandbox-key",
        PAYMENT_SELCOM_SANDBOX_MERCHANT_CODE: "sandbox-merchant",
        PAYMENT_SELCOM_SANDBOX_BASE_URL: "https://sandbox.example",
      };
      const service = new PaymentMethodConfigService(env, true);
      expect(service.getMode("MPESA")).toBe("live");
      expect(service.isOperational("MPESA")).toBe(false);

      const adminView = service
        .listAdminStatus()
        .find((m) => m.code === "mpesa")!;
      expect(adminView.missingKeys).toEqual(
        expect.arrayContaining([
          "PAYMENT_SELCOM_LIVE_API_KEY",
          "PAYMENT_SELCOM_LIVE_MERCHANT_CODE",
          "PAYMENT_SELCOM_LIVE_BASE_URL",
        ]),
      );
    });

    it("live with complete live credentials becomes operational", () => {
      const env: Record<string, string> = {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
        PAYMENT_SELCOM_LIVE_API_KEY: "live-key",
        PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "live-merchant",
        PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.selcom.example",
      };
      const service = new PaymentMethodConfigService(env, true);
      expect(service.isOperational("MPESA")).toBe(true);
      const runtime = service.getRuntimeConfig("MPESA");
      expect(runtime.environment).toBe("LIVE");
      expect(runtime.providerChannel).toBe("MPESA");
      expect(runtime.credentials.API_KEY).toBe("live-key");
    });
  });

  describe("sandbox mode requires sandbox credentials", () => {
    it("sandbox without credentials is non-operational", () => {
      const service = new PaymentMethodConfigService(
        { NODE_ENV: "test", PAYMENT_MPESA_MODE: "sandbox" },
        false,
      );
      expect(service.getMode("MPESA")).toBe("sandbox");
      expect(service.isOperational("MPESA")).toBe(false);
    });

    it("sandbox with sandbox credentials is operational", () => {
      const service = new PaymentMethodConfigService(
        {
          NODE_ENV: "test",
          PAYMENT_MPESA_MODE: "sandbox",
          PAYMENT_SELCOM_SANDBOX_API_KEY: "sk",
          PAYMENT_SELCOM_SANDBOX_MERCHANT_CODE: "mc",
          PAYMENT_SELCOM_SANDBOX_BASE_URL: "https://sandbox.example",
        },
        false,
      );
      expect(service.isOperational("MPESA")).toBe(true);
      expect(service.getRuntimeConfig("MPESA").environment).toBe("SANDBOX");
    });

    it("internal methods (wallet, bank transfer) require no credentials to operate", () => {
      const service = new PaymentMethodConfigService(
        {
          NODE_ENV: "test",
          PAYMENT_WALLET_MODE: "sandbox",
          PAYMENT_BANK_TRANSFER_MODE: "live",
        },
        false,
      );
      expect(service.isOperational("WALLET")).toBe(true);
      expect(service.isOperational("BANK_TRANSFER")).toBe(true);
      expect(service.getRuntimeConfig("BANK_TRANSFER").environment).toBe(
        "LIVE",
      );
    });
  });

  describe("off mode", () => {
    it("off is never operational and never required to be configured", () => {
      const service = new PaymentMethodConfigService(
        {
          NODE_ENV: "production",
          PAYMENT_HALOPESA_MODE: "off",
        },
        true,
      );
      expect(service.getMode("HALOPESA")).toBe("off");
      expect(service.isOperational("HALOPESA")).toBe(false);
      expect(service.validateAll()).not.toContain("HALOPESA");
    });
  });

  describe("public discovery payload", () => {
    it("never leaks credentials and only advertises operational methods as available", () => {
      const env: Record<string, string> = {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
        PAYMENT_SELCOM_LIVE_API_KEY: "super-secret-live-key",
        PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "m1",
        PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.example",
        PAYMENT_AIRTEL_MONEY_MODE: "off",
      };
      const service = new PaymentMethodConfigService(env, true);
      const payload = service.listPublic();
      const serialized = JSON.stringify(payload);

      expect(serialized).not.toContain("super-secret-live-key");
      expect(serialized).not.toContain("API_KEY");
      expect(serialized).not.toContain("MERCHANT_CODE");

      const mpesa = payload.find((m) => m.code === "mpesa")!;
      expect(mpesa.status).toBe("live");
      expect(mpesa.available).toBe(true);

      const airtel = payload.find((m) => m.code === "airtel_money")!;
      expect(airtel.status).toBe("off");
      expect(airtel.available).toBe(false);
    });
  });

  describe("admin payload", () => {
    it("includes configuration state but only credential presence booleans", () => {
      const env: Record<string, string> = {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
        PAYMENT_SELCOM_LIVE_API_KEY: "super-secret-live-key",
        PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "m1",
        PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.example",
      };
      const service = new PaymentMethodConfigService(env, true);
      const serialized = JSON.stringify(service.listAdminStatus());

      expect(serialized).not.toContain("super-secret-live-key");

      const mpesa = service.listAdminStatus().find((m) => m.code === "mpesa")!;
      expect(mpesa.credentialsPresent.API_KEY).toBe(true);
      expect(mpesa.operationalStatus).toBe("operational");
    });
  });

  describe("method code normalization", () => {
    it("maps deprecated/generic aliases to canonical codes", () => {
      const service = new PaymentMethodConfigService(
        { NODE_ENV: "test" },
        false,
      );
      expect(service.normalizeMethodCode("TIGO_PESA")).toBe("MIXX_BY_YAS");
      expect(service.normalizeMethodCode("MOBILE_MONEY")).toBe("MPESA");
      expect(service.normalizeMethodCode("MNO")).toBe("MPESA");
      expect(service.normalizeMethodCode("MPESA")).toBe("MPESA");
      expect(service.normalizeMethodCode("UNKNOWN")).toBeNull();
    });
  });
});
