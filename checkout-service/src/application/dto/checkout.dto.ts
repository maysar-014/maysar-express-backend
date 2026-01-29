/**
 * Checkout Service DTOs
 * 
 * Data Transfer Objects for API boundaries.
 * No domain entities cross service boundaries.
 */

export interface CartItemDTO {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
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

export interface AddToCartRequestDTO {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
}

export interface UpdateCartItemRequestDTO {
  quantity: number;
}

export interface RemoveCartItemRequestDTO {
  productId: string;
  variantId?: string;
}

export interface CheckoutSessionDTO {
  id: string;
  cartId: string;
  userId: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethodId?: string;
  paymentMethodId?: string;
  paymentStatus?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface InitiateCheckoutRequestDTO {
  cartId: string;
  shippingAddressId: string;
  billingAddressId: string;
  shippingMethodId: string;
}

export interface ApplyDiscountRequestDTO {
  code: string;
  value: number;
  type: 'percentage' | 'fixed';
}

export interface OrderDTO {
  id: string;
  checkoutSessionId: string;
  userId: string;
  status: string;
  items: OrderItemDTO[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: string;
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreateOrderRequestDTO {
  checkoutSessionId: string;
  paymentMethodId: string;
}

export interface PricingCalculationDTO {
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

export interface CheckoutValidationErrorDTO {
  field: string;
  message: string;
}

export interface CheckoutResponseDTO {
  success: boolean;
  data?: CheckoutSessionDTO;
  errors?: CheckoutValidationErrorDTO[];
  pricing?: PricingCalculationDTO;
}
