export const Enabler_Status = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  ACTIVE: 'ACTIVE',
  /**
   * Capability-limited: the enabler keeps discovery/sharing but the backend
   * refuses order-draft creation and customer-link generation (spec §5).
   */
  RESTRICTED: 'RESTRICTED',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type Enabler_Status = (typeof Enabler_Status)[keyof typeof Enabler_Status];

/**
 * Training status values used by the activation requirement gate (spec §6).
 * Training truth itself lives in the shared training domain; this mirrors it.
 */
export const Enabler_TrainingStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type Enabler_TrainingStatus = (typeof Enabler_TrainingStatus)[keyof typeof Enabler_TrainingStatus];

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
