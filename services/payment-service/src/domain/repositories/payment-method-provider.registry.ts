import { IPaymentProvider } from "./payment-provider.gateway";
import { PaymentMethodCode } from "../../config/payment-methods.config";

/**
 * Payment method → provider port.
 *
 * Resolves the isolated, channel-specific provider adapter for a payment
 * method using that method's own environment configuration and scoped
 * credentials. The orchestration layer never hard-codes provider internals.
 */
export interface IPaymentMethodProviderRegistry {
  getProvider(methodCode: PaymentMethodCode): IPaymentProvider;
}
