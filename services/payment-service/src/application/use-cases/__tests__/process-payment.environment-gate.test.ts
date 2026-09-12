import {
  ProcessPaymentUseCase,
  ProcessPaymentDTO,
} from "../process-payment.use-case";
import {
  PaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentFailureCode,
} from "../../../domain/entities/payment.entity";
import { PaymentMethodConfigService } from "../../../config/payment-methods.config";

describe("ProcessPaymentUseCase — payment-method environment gate", () => {
  let useCase: ProcessPaymentUseCase;
  let mockRepository: any;
  let mockProviderFactory: any;
  let mockProvider: any;
  let mockFraudEngine: any;
  let mockProcessingEngine: any;
  let mockLimitsPolicy: any;
  let mockFraudPolicy: any;
  let configService: PaymentMethodConfigService;

  const buildDTO = (
    overrides: Partial<ProcessPaymentDTO> = {},
  ): ProcessPaymentDTO => ({
    orderId: "order-1",
    userId: "user-1",
    amount: 50000,
    currency: "TZS",
    method: PaymentMethod.MPESA,
    customerInfo: {
      email: "test@example.com",
      phoneNumber: "+255712345678",
      name: "Test User",
      ipAddress: "192.168.1.1",
      deviceFingerprint: "device-123",
    },
    ...overrides,
  });

  const buildConfig = (
    env: Record<string, string>,
    isProduction = true,
  ): PaymentMethodConfigService =>
    new PaymentMethodConfigService(
      { NODE_ENV: isProduction ? "production" : "test", ...env },
      isProduction,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      save: jest.fn(),
      update: jest.fn(),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      getTotalAmountByUserId: jest.fn().mockResolvedValue(0),
      getPaymentCountByUserId: jest.fn().mockResolvedValue(0),
    };

    mockProvider = {
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        status: "PROCESSING",
        providerReference: "prov-ref-123",
        providerTransactionId: "tx-123",
      }),
    };

    mockProviderFactory = jest.fn().mockReturnValue(mockProvider);

    mockFraudEngine = {
      assessTransaction: jest.fn().mockResolvedValue({
        riskScore: 0.05,
        riskLevel: "LOW",
        recommendation: "APPROVE",
      }),
    };

    mockProcessingEngine = {
      validatePaymentRequest: jest
        .fn()
        .mockReturnValue({ isValid: true, errors: [] }),
      calculateFees: jest
        .fn()
        .mockReturnValue({ platformFee: 2, providerFee: 1, totalFee: 3 }),
    };

    mockLimitsPolicy = {
      isWithinLimits: jest
        .fn()
        .mockReturnValue({ isWithinLimits: true, violations: [] }),
    };

    mockFraudPolicy = {
      getActionForRiskLevel: jest
        .fn()
        .mockReturnValue({ autoDecline: false, requiresManualReview: false }),
    };
  });

  const instantiate = (
    env: Record<string, string>,
    isProduction = true,
  ): void => {
    configService = buildConfig(env, isProduction);
    useCase = new ProcessPaymentUseCase(
      mockRepository,
      mockProviderFactory,
      mockFraudEngine,
      mockProcessingEngine,
      mockLimitsPolicy,
      mockFraudPolicy,
      configService,
    );
  };

  it("rejects a disabled method with METHOD_DISABLED before reaching the provider", async () => {
    instantiate({ PAYMENT_HALOPESA_MODE: "off" });
    const result = await useCase.execute(
      buildDTO({
        method: PaymentMethod.HALOPESA,
        currency: "TZS",
        amount: 50000,
      }),
    );

    expect(result.success).toBe(false);
    expect(result.failureCode).toBe(PaymentFailureCode.METHOD_DISABLED);
    expect(mockProvider.processPayment).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it("rejects a misconfigured method with METHOD_MISCONFIGURED (live without live creds)", async () => {
    instantiate({ PAYMENT_CARD_MODE: "live" }); // no PAYMENT_SELCOM_LIVE_* creds
    const result = await useCase.execute(
      buildDTO({ method: PaymentMethod.CARD, currency: "TZS", amount: 50000 }),
    );

    expect(result.success).toBe(false);
    expect(result.failureCode).toBe(PaymentFailureCode.METHOD_MISCONFIGURED);
    expect(mockProvider.processPayment).not.toHaveBeenCalled();
  });

  it("rejects an unknown method with METHOD_NOT_FOUND", async () => {
    instantiate({});
    const result = await useCase.execute(
      buildDTO({ method: "MYTHICAL_WALLET" as unknown as PaymentMethod }),
    );

    expect(result.success).toBe(false);
    expect(result.failureCode).toBe(PaymentFailureCode.METHOD_NOT_FOUND);
    expect(mockProvider.processPayment).not.toHaveBeenCalled();
  });
  it("accepts an operational live method and stamps the LIVE environment on the result", async () => {
    instantiate({
      PAYMENT_MPESA_MODE: "live",
      PAYMENT_SELCOM_LIVE_API_KEY: "live-key",
      PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "live-merchant",
      PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.selcom.example",
    });
    const result = await useCase.execute(buildDTO());

    expect(result.success).toBe(true);
    expect(result.environment).toBe("LIVE");
    expect(mockProvider.processPayment).toHaveBeenCalledTimes(1);
    // payment was persisted with environment + providerChannel metadata
    const saved = mockRepository.save.mock.calls[0][0];
    const props = saved.toObject();
    expect(props.environment).toBe("LIVE");
    expect(props.metadata.providerChannel).toBe("MPESA");
    expect(props.provider).toBe(PaymentProvider.PAYMENT_GATEWAY);
  });

  it("stamps SANDBOX for sandbox-operational methods", async () => {
    instantiate(
      {
        PAYMENT_AIRTEL_MONEY_MODE: "sandbox",
        PAYMENT_SELCOM_SANDBOX_API_KEY: "sandbox-key",
        PAYMENT_SELCOM_SANDBOX_MERCHANT_CODE: "sandbox-merchant",
        PAYMENT_SELCOM_SANDBOX_BASE_URL: "https://sandbox.selcom.example",
      },
      false,
    );
    const result = await useCase.execute(
      buildDTO({ method: PaymentMethod.AIRTEL_MONEY }),
    );

    expect(result.success).toBe(true);
    expect(result.environment).toBe("SANDBOX");
    const saved = mockRepository.save.mock.calls[0][0];
    expect(saved.toObject().environment).toBe("SANDBOX");
  });

  it("routes WALLET payments through the internal wallet provider preserving the same lifecycle", async () => {
    instantiate({ PAYMENT_WALLET_MODE: "live" });
    const walletProvider = {
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        status: "COMPLETED",
        providerReference: "wallet_pay_1",
      }),
    };
    const walletFactory = jest.fn().mockReturnValue(walletProvider);

    useCase = new ProcessPaymentUseCase(
      mockRepository,
      walletFactory,
      mockFraudEngine,
      mockProcessingEngine,
      mockLimitsPolicy,
      mockFraudPolicy,
      configService,
    );

    const result = await useCase.execute(
      buildDTO({ method: PaymentMethod.WALLET, amount: 1000 }),
    );

    expect(result.success).toBe(true);
    expect(result.environment).toBe("LIVE");
    expect(walletProvider.processPayment).toHaveBeenCalledTimes(1);
    const saved = mockRepository.save.mock.calls[0][0];
    expect(saved.toObject().provider).toBe(PaymentProvider.INTERNAL_WALLET);
  });

  it("returns an existing payment for a repeated idempotency key (duplicate protection)", async () => {
    instantiate({
      PAYMENT_MPESA_MODE: "live",
      PAYMENT_SELCOM_LIVE_API_KEY: "live-key",
      PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "live-merchant",
      PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.selcom.example",
    });

    const existingPayment = {
      id: "pay_existing",
      status: PaymentStatus.PROCESSING,
      environment: "LIVE",
      metadata: { providerReference: "prov-ref-existing" },
    };
    mockRepository.findByIdempotencyKey.mockResolvedValue(existingPayment);

    const result = await useCase.execute(
      buildDTO({ idempotencyKey: "idem-123" }),
    );

    expect(result.paymentId).toBe("pay_existing");
    expect(result.success).toBe(false); // PROCESSING is not COMPLETED
    expect(result.failureCode).toBe(PaymentFailureCode.DUPLICATE_PAYMENT);
    expect(mockRepository.save).not.toHaveBeenCalled();
    expect(mockProvider.processPayment).not.toHaveBeenCalled();
  });
});
