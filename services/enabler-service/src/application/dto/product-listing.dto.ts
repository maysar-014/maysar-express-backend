export class CreateProductListingDto {
    productId: string;
    customPrice?: number;
    priceMarkup?: number;
    minOrderQuantity?: number;
    deliveryTimeframe?: string;
    returnPolicy?: string;
    warrantyPeriod?: number;
    visibility?: boolean;
}

export class UpdateProductListingDto {
    customPrice?: number;
    priceMarkup?: number;
    visibility?: boolean;
    minOrderQuantity?: number;
    deliveryTimeframe?: string;
}

export class ProductListingResponseDto {
    id: string;
    enablerId: string;
    productId: string;
    sellerId: string;
    status: string;
    customPrice?: number;
    priceMarkup?: number;
    visibility: boolean;
    sellerApproved: boolean;
    views: number;
    clicks: number;
    orders: number;
    createdAt: Date;
}
