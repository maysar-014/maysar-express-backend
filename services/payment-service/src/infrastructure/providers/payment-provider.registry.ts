import { IPaymentProvider } from "../../domain/repositories/payment-provider.gateway";
import { IPaymentMethodProviderRegistry } from "../../domain/repositories/payment-method-provider.registry";
import {
  PaymentMethodCode,
  PaymentMethodConfigService,
} from "../../config/payment-methods.config";
import { SelcomPesaAdapter } from "./selcom-pesa.adapter";
import { InternalWalletAdapter } from "./internal-wallet.adapter";
import { InternalBankTransferAdapter } from "./internal-bank-transfer.adapter";

/**
 * Concrete payment-method provider registry.
 *
 * Builds an isolated adapter per method from the method's own runtime config:
 * selcom-backed channels (M-Pesa, Airtel Money, Mixx by Yas, HaloPesa, Card)
 * get a per-channel Selcom adapter carrying their OWN scoped credentials and
 * active environment; internal methods (Wallet, Bank Transfer) get their
 * dedicated internal adapters. No method ever shares another method's
 * credentials or adapter.
 */
export class PaymentMethodProviderRegistry implements IPaymentMethodProviderRegistry {
  private readonly walletAdapter: InternalWalletAdapter;
  private readonly bankTransferAdapter: InternalBankTransferAdapter;

  constructor(
    private readonly configService: PaymentMethodConfigService,
    walletAdapter?: InternalWalletAdapter,
    bankTransferAdapter?: InternalBankTransferAdapter,
  ) {
    this.walletAdapter = walletAdapter ?? new InternalWalletAdapter();
    this.bankTransferAdapter =
      bankTransferAdapter ?? new InternalBankTransferAdapter();
  }

  getProvider(methodCode: PaymentMethodCode): IPaymentProvider {
    // Throws PaymentConfigurationError when the method is not operational —
    // the process-payment availability gate runs *before* adapters are ever
    // reached, so non-operational methods cannot dispatch to a provider.
    const runtime = this.configService.getRuntimeConfig(methodCode);

    switch (runtime.provider) {
      case "internal_wallet":
        return this.walletAdapter;
      case "internal_bank_transfer":
        return this.bankTransferAdapter;
      case "selcom": {
        return new SelcomPesaAdapter({
          merchantCode: runtime.credentials.MERCHANT_CODE,
          apiKey: runtime.credentials.API_KEY,
          baseUrl: runtime.credentials.BASE_URL,
          providerChannel: runtime.providerChannel,
          environment: runtime.environment,
        });
      }
      default:
        throw new Error(
          `No provider adapter registered for payment method ${methodCode}`,
        );
    }
  }
}
