export interface SellerListingInput {
  sellerId: string;
  price: number;
  rating: number;
  stock: number;
  matchConfidence: number;
  isSuspended: boolean;
  lastUpdated: Date;
  isNewSeller?: boolean;
  recencyBoost?: boolean;
}
