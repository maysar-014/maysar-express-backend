import { SellerListingInput } from '../value-objects/seller-listing-input.value-object';

export interface ISellerListingQueryService {
  getListingsForProduct(productId: string): Promise<SellerListingInput[]>;
}
