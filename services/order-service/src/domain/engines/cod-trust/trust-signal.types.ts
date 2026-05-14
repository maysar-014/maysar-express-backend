export enum TrustSignalType {
  SUCCESSFUL_DELIVERY        = 'SUCCESSFUL_DELIVERY',
  PHONE_VERIFIED             = 'PHONE_VERIFIED',
  HIGH_VALUE_COMPLETION      = 'HIGH_VALUE_COMPLETION',
  ACCOUNT_AGE_MILESTONE      = 'ACCOUNT_AGE_MILESTONE',
  POST_DISPATCH_CANCELLATION = 'POST_DISPATCH_CANCELLATION',
  DELIVERY_REFUSED           = 'DELIVERY_REFUSED',
  DISPUTE_LOST               = 'DISPUTE_LOST',
  COURIER_NEGATIVE_REPORT    = 'COURIER_NEGATIVE_REPORT',
}

export type TrustTier = 'NEW_BUYER' | 'TRUSTED_BEGINNER' | 'TRUSTED_BUYER';

export const SIGNAL_WEIGHTS: Record<TrustSignalType, number> = {
  [TrustSignalType.SUCCESSFUL_DELIVERY]:        +8,
  [TrustSignalType.PHONE_VERIFIED]:             +5,
  [TrustSignalType.HIGH_VALUE_COMPLETION]:      +10,
  [TrustSignalType.ACCOUNT_AGE_MILESTONE]:      +7,
  [TrustSignalType.POST_DISPATCH_CANCELLATION]: -10,
  [TrustSignalType.DELIVERY_REFUSED]:           -15,
  [TrustSignalType.DISPUTE_LOST]:               -12,
  [TrustSignalType.COURIER_NEGATIVE_REPORT]:    -8,
};

export interface TrustScoreRecord {
  buyerId: string;
  score: number;
  tier: TrustTier;
  updatedAt: Date;
  createdAt: Date;
}

export interface ScoreEventRecord {
  id: string;
  buyerId: string;
  signalType: TrustSignalType;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  sourceService: string;
  sourceEntityId: string;
  createdAt: Date;
}

export interface RestrictionRecord {
  id: string;
  buyerId: string;
  reason: string;
  startAt: Date;
  endsAt: Date;
  permanent: boolean;
  createdAt: Date;
}
