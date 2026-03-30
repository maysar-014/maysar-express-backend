import type { BusinessResponseDto } from './business.dto';

export interface PublicSellerSummaryDto {
  sellerId: string;
  sellerName: string;
  businessCount: number;
  industries: string[];
  primaryBusiness: BusinessResponseDto;
}

export interface PublicSellerProfileDto extends PublicSellerSummaryDto {
  businesses: BusinessResponseDto[];
}

export interface PublicSellerIndustriesDto {
  sellerId: string;
  industries: string[];
  businessCount: number;
}

export interface PublicSellerListResponseDto {
  items: PublicSellerSummaryDto[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset?: number;
  };
}
