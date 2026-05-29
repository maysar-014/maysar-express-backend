import { SellerListingInput } from '../../domain/value-objects/seller-listing-input.value-object';
import { AnomalyFlagResult } from '../../domain/buy-box/types';

export interface ComputeBuyBoxRequestDto {
  productId: string;
  listings: SellerListingInput[];
}

export interface BuyBoxAlternativeDto {
  sellerId: string;
  score: number;
  rank: number;
}

export interface BuyBoxResponseDto {
  productId: string;
  primarySellerId: string | null;
  primaryScore: number | null;
  alternatives: BuyBoxAlternativeDto[];
  lastComputedAt: Date;
  anomalyFlags?: AnomalyFlagResult[];
}
