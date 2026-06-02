# Maysar Payment Methods

## Current State

The payment service currently runs with an internal payment-gateway bridge. Live third-party payment processing is disabled for now while Selcom Pesa is evaluated as the next external gateway.

## Supported Methods

- `WALLET` is fully active.
- `MOBILE_PAYMENT`, `CARD`, and `BANK_TRANSFER` are accepted by the domain layer but return a disabled-gateway response until Selcom Pesa is enabled.
- `COD` commitment flows continue to work through the wallet hold path.

## Behavior

1. The service validates method, currency, and amount.
2. Wallet payments are processed locally.
3. Non-wallet payments return a clear disabled-gateway response.
4. Webhook routes are disabled and return `410 Gone`.

## Configuration

```bash
SELCOM_PESA_MERCHANT_CODE="your-merchant-code"
SELCOM_PESA_API_KEY="your-api-key"
SELCOM_PESA_BASE_URL="https://example.invalid"
SELCOM_PESA_CALLBACK_URL="http://localhost:3000/payment/callback"
```

## Notes

- No PaymentGateway live calls remain in the current runtime.
- Selcom Pesa is the planned external integration path.
- The current adapter is intentionally non-networked to keep the system safe until the new contract is finalized.
