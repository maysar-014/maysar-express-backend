export enum PayoutStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSED = 'processed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
  PESAPAL = 'pesapal',
  CRYPTO = 'crypto',
  CHECK = 'check'
}
