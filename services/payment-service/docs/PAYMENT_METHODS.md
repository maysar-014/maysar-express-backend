# Maysar Payment Methods - Tanzanian Mobile Money Integration

## Overview

The Maysar platform integrates with Pesapal payment gateway to provide comprehensive payment solutions for Tanzania, supporting all major mobile money services and traditional payment methods.

## Supported Payment Methods

### 🟢 **Tanzanian Mobile Money Services**

#### 1. **M-PESA** (Safaricom)
- **Most Popular**: 70%+ market share in Tanzania
- **Integration**: Full Pesapal integration
- **Phone Validation**: `+2557XXXXXXXX` or `+2556XXXXXXXX`
- **Processing**: Instant payment confirmation
- **Limits**: Configurable transaction limits

#### 2. **MIXX by Yas** (YAS - Yozani Africa Solutions)
- **Network**: Independent mobile money service
- **Integration**: Full Pesapal integration
- **Phone Validation**: `+2557XXXXXXXX`
- **Processing**: Real-time payment processing
- **Features**: Competitive fees, wide acceptance

#### 3. **AIRTEL MONEY** (Airtel Tanzania)
- **Network**: Airtel mobile network
- **Integration**: Full Pesapal integration
- **Phone Validation**: `+2557XXXXXXXX` or `+2556XXXXXXXX`
- **Processing**: Instant confirmations
- **Coverage**: Nationwide network

#### 4. **HALOPESA** (Vodacom Tanzania)
- **Network**: Vodacom mobile network
- **Integration**: Full Pesapal integration
- **Phone Validation**: `+2557XXXXXXXX` or `+2556XXXXXXXX`
- **Processing**: Fast payment processing
- **Features**: Integrated with Vodacom services

### 💳 **Traditional Payment Methods**

#### 5. **Card Payments**
- **Networks**: Visa, Mastercard, American Express
- **Processing**: Secure tokenization via Pesapal
- **PCI Compliance**: Full PCI DSS compliance
- **3D Secure**: Optional enhanced security

#### 6. **Bank Transfers**
- **Banks**: All major Tanzanian banks (CRDB, NMB, NBC, etc.)
- **Processing**: Direct bank integration via Pesapal
- **Confirmation**: Real-time bank confirmations

#### 7. **Platform Wallet**
- **Internal**: Maysar platform wallet
- **Features**: Stored value, quick payments
- **Integration**: Seamless with other payment methods
- **Security**: Encrypted wallet balances

## API Integration

### Payment Initiation

```typescript
POST /payment/initiate
{
  "orderId": "order-uuid",
  "buyerId": "user-uuid",
  "amount": { "amount": 10000, "currency": "TZS" },
  "method": "MPESA", // MPESA, MIXX_BY_YAS, AIRTEL_MONEY, HALOPESA, CARD, BANK, WALLET
  "description": "Payment for Order #123",
  "customerInfo": {
    "email": "customer@example.com",
    "phone": "+255712345678", // Required for mobile money
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Phone Number Validation

**Tanzanian Phone Number Formats:**
- `+255712345678` (International format)
- `255712345678` (Country code format)
- `0712345678` (Local format)

**Validation Rules:**
- Must start with `+255`, `255`, or `0`
- Second digit must be `6` or `7` (Tanzanian mobile prefixes)
- Total 9 digits after country code
- Regex: `/^(\+255|255|0)[67][0-9]{7}$/`

### Payment Flow

1. **Initiate Payment** → API validates method and phone
2. **Pesapal Redirect** → User redirected to Pesapal payment page
3. **Mobile Money Prompt** → User receives payment prompt on phone
4. **Payment Confirmation** → User enters PIN to confirm
5. **Callback/Webhook** → Pesapal sends payment status
6. **Order Update** → System updates order status
7. **Event Emission** → PaymentSucceeded event triggered

## Configuration

### Environment Variables

```bash
# Pesapal Configuration
PESAPAL_CONSUMER_KEY="your-consumer-key"
PESAPAL_CONSUMER_SECRET="your-consumer-secret"
PESAPAL_ENVIRONMENT="sandbox" # sandbox or live
PESAPAL_CALLBACK_URL="http://localhost:3000/payment/callback"
PESAPAL_NOTIFICATION_ID="your-notification-id"
```

### Supported Methods Array

```typescript
const TANZANIAN_PAYMENT_METHODS = [
  'MPESA',           // Safaricom
  'MIXX_BY_YAS',     // YAS
  'AIRTEL_MONEY',    // Airtel
  'HALOPESA',        // Vodacom
  'CARD',            // Visa/Mastercard
  'BANK',            // Bank transfer
  'WALLET'           // Platform wallet
]
```

## Error Handling

### Validation Errors

```json
{
  "error": "Invalid payment method. Supported methods: MPESA, MIXX_BY_YAS, AIRTEL_MONEY, HALOPESA, CARD, BANK, WALLET"
}
```

```json
{
  "error": "MPESA requires a phone number. Please provide customerInfo.phone"
}
```

```json
{
  "error": "Invalid Tanzanian phone number format. Use +255XXXXXXXXX, 255XXXXXXXXX, or 0XXXXXXXXX"
}
```

### Payment Processing Errors

- **Insufficient Balance**: Mobile money account has insufficient funds
- **Invalid PIN**: User entered wrong PIN
- **Timeout**: Payment not completed within time limit
- **Network Error**: Temporary connectivity issues
- **Cancelled**: User cancelled the payment

## Reconciliation & Monitoring

### Automatic Reconciliation
- Compares local payment records with Pesapal status
- Handles discrepancies and failed callbacks
- Generates reconciliation reports

### Payment Analytics
- Success rates by payment method
- Average processing times
- Failure reasons and trends
- Geographic payment distribution

## Security Features

### PCI DSS Compliance
- No card data storage on platform
- Tokenization for sensitive data
- Encrypted payment processing
- Secure callback validation

### Fraud Prevention
- Amount limits per transaction
- Daily transaction limits
- Suspicious activity monitoring
- IP-based restrictions

## Testing

### Sandbox Environment
- Use `PESAPAL_ENVIRONMENT=sandbox`
- Test all payment methods
- Simulate success/failure scenarios
- Validate phone number formats

### Test Phone Numbers
```
MPESA: +255712345678
MIXX by Yas: +255712345679
AIRTEL MONEY: +255712345680
HALOPESA: +255712345681
```

## Production Deployment

### Go-Live Checklist
- [ ] Valid Pesapal production credentials
- [ ] All payment methods tested
- [ ] Phone validation working
- [ ] Callback URLs configured
- [ ] Reconciliation jobs scheduled
- [ ] Monitoring alerts configured
- [ ] PCI compliance verified

### Monitoring
- Payment success rates (>99%)
- Average processing time (<30 seconds)
- Failed transaction alerts
- Reconciliation discrepancies

## Support & Troubleshooting

### Common Issues
1. **Phone number format**: Ensure Tanzanian format
2. **Network issues**: Check mobile network connectivity
3. **PIN errors**: User entered wrong PIN
4. **Timeout**: Payment not completed within 5 minutes

### Support Contacts
- Pesapal Support: support@pesapal.com
- Maysar Dev Team: dev@maysar.co.tz

---

**Last Updated**: December 29, 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
