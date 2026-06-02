/**
 * Data Transfer Objects (DTOs)
 * Defines request/response structures
 */

export interface AddToCartRequest {
  cartId: string;
  userId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
}

export interface RemoveFromCartRequest {
  cartId: string;
  userId: string;
  productId: string;
  variantId?: string;
}

export interface GetCartRequest {
  cartId: string;
  userId: string;
}

export interface ClearCartRequest {
  cartId: string;
  userId: string;
}

export interface InitiateCheckoutRequest {
  cartId: string;
  userId: string;
  shippingAddressId: string;
  billingAddressId: string;
  shippingMethodId: string;
  shippingCost: number;
  enablerCode?: string;
  idempotencyKey?: string;
}

export interface ConfirmCheckoutRequest {
  sessionId: string;
  paymentMethodId: string;
  idempotencyKey?: string;
}

export interface ApplyDiscountRequest {
  checkoutId: string;
  code: string;
  value: number;
  type: 'fixed' | 'percentage';
}

export interface CartItemDTO {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
  lineTotal: number;
}

export interface CartDTO {
  id: string;
  userId: string;
  items: CartItemDTO[];
  subtotal: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingDTO {
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
}

export interface CheckoutSessionDTO {
  id: string;
  cartId: string;
  userId: string;
  enablerId?: string;
  enablerCode?: string;
  status: string;
  pricing: PricingDTO;
  deliveryEligible?: boolean;
  minimumBasketValue?: number;
  minimumBasketShortfall?: number;
  minimumBasketMessage?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OrderDTO {
  id: string;
  checkoutSessionId: string;
  userId: string;
  status: string;
  totalAmount: number;
  items: any[];
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
}
