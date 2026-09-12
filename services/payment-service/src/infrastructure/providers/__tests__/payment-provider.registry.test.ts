import { PaymentMethodProviderRegistry } from "../payment-provider.registry";
import { PaymentMethodConfigService } from "../../../config/payment-methods.config";
import { SelcomPesaAdapter } from "../selcom-pesa.adapter";
import { InternalWalletAdapter } from "../internal-wallet.adapter";
import { InternalBankTransferAdapter } from "../internal-bank-transfer.adapter";

describe("PaymentMethodProviderRegistry", () => {
  it("returns the shared internal adapters for wallet and bank transfer", () => {
    const config = new PaymentMethodConfigService(
      {
        NODE_ENV: "test",
        PAYMENT_WALLET_MODE: "live",
        PAYMENT_BANK_TRANSFER_MODE: "live",
      },
      false,
    );
    const walletAdapter = new InternalWalletAdapter();
    const bankAdapter = new InternalBankTransferAdapter();
    const registry = new PaymentMethodProviderRegistry(
      config,
      walletAdapter,
      bankAdapter,
    );

    expect(registry.getProvider("WALLET")).toBe(walletAdapter);
    expect(registry.getProvider("BANK_TRANSFER")).toBe(bankAdapter);
  });

  it("builds an isolated per-channel Selcom adapter with scoped credentials", () => {
    const config = new PaymentMethodConfigService(
      {
        NODE_ENV: "production",
        PAYMENT_MPESA_MODE: "live",
        PAYMENT_SELCOM_LIVE_API_KEY: "a-key",
        PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "m-code",
        PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.selcom.example",
      },
      true,
    );
    const registry = new PaymentMethodProviderRegistry(config);

    const mpesaProvider = registry.getProvider("MPESA") as SelcomPesaAdapter;
    expect(mpesaProvider).toBeInstanceOf(SelcomPesaAdapter);
    expect(mpesaProvider.getProviderName()).toBe("selcom-pesa:mpesa");

    // A different channel gets its own adapter instance (no shared state).
    const airtelConfig = new PaymentMethodConfigService(
      {
        NODE_ENV: "production",
        PAYMENT_AIRTEL_MONEY_MODE: "live",
        PAYMENT_SELCOM_LIVE_API_KEY: "a-key",
        PAYMENT_SELCOM_LIVE_MERCHANT_CODE: "m-code",
        PAYMENT_SELCOM_LIVE_BASE_URL: "https://api.selcom.example",
      },
      true,
    );
    const airtelRegistry = new PaymentMethodProviderRegistry(airtelConfig);
    const airtelProvider = airtelRegistry.getProvider(
      "AIRTEL_MONEY",
    ) as SelcomPesaAdapter;
    expect(airtelProvider.getProviderName()).toBe("selcom-pesa:airtel_money");
    expect(airtelProvider).not.toBe(mpesaProvider);
  });

  it("throws for a method that is not operationally configured", () => {
    const config = new PaymentMethodConfigService(
      {
        NODE_ENV: "production",
        PAYMENT_CARD_MODE: "live", // missing live credentials
      },
      true,
    );
    const registry = new PaymentMethodProviderRegistry(config);

    expect(() => registry.getProvider("CARD")).toThrow(
      /CARD|Card|not operational/,
    );
  });
});
