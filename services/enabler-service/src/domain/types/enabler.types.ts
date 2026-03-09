export const Enabler_Status = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
} as const;

export type Enabler_Status = (typeof Enabler_Status)[keyof typeof Enabler_Status];

export const Enabler_Tier = {
  BRONZE: 'BRONZE',
  SILVER: 'SILVER',
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
} as const;

export type Enabler_Tier = (typeof Enabler_Tier)[keyof typeof Enabler_Tier];

export const Enabler_ListingStatus = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
  REMOVED: 'REMOVED',
} as const;

export type Enabler_ListingStatus = (typeof Enabler_ListingStatus)[keyof typeof Enabler_ListingStatus];

export const Enabler_OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;

export type Enabler_OrderStatus = (typeof Enabler_OrderStatus)[keyof typeof Enabler_OrderStatus];
