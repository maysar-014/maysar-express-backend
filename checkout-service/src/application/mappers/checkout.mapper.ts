/**
 * Checkout Mapper
 * 
 * Converts between domain objects and DTOs.
 * Maintains DTO firewall - no domain entities cross boundaries.
 */

import { Cart } from '../../domain/value-objects/cart.value-object';
import { Money } from '../../domain/value-objects/money.value-object';
import { CartDTO, CartItemDTO, PricingCalculationDTO } from './checkout.dto';
import { PricingCalculation } from '../../domain/policies/pricing.policy';

export class CheckoutMapper {
  static cartToDTO(cart: Cart, cartId: string, userId: string): CartDTO {
    const items = cart.getItems().map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime
    }));

    return {
      id: cartId,
      userId,
      items,
      subtotal: cart.getSubtotal(),
      itemCount: cart.getItemCount(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static pricingToDTO(pricing: PricingCalculation): PricingCalculationDTO {
    return {
      subtotal: pricing.subtotal.getAmount(),
      shippingCost: pricing.shippingCost.getAmount(),
      taxAmount: pricing.taxAmount.getAmount(),
      discountAmount: pricing.discountAmount.getAmount(),
      total: pricing.total.getAmount()
    };
  }

  static cartItemsFromDTO(items: CartItemDTO[]): Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    priceAtTime: number;
  }> {
    return items.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime
    }));
  }
}
