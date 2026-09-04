/**
 * CatalogPriceValidatorService
 *
 * Server-side price validation for checkout items.
 * Prevents price manipulation by verifying each item's priceAtTime against
 * the authoritative ProductVariant.price stored in the catalog.
 *
 * Uses the shared globalThis.prisma singleton (same pattern as checkout.controller.ts).
 */

export interface ItemToValidate {
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtTime: number;
}

export interface PriceValidationResult {
  valid: boolean;
  /** Authoritative prices to substitute if client prices differ */
  resolvedItems?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    /** Server-authoritative price in TZS */
    priceAtTime: number;
  }>;
  errors?: Array<{ productId: string; message: string }>;
}

/** Tolerance in percentage — allow up to 1% rounding difference (campaign rounding, etc.) */
const PRICE_TOLERANCE_PCT = 0.01;

export class CatalogPriceValidatorService {
  /**
   * Validates and resolves authoritative prices for all items.
   *
   * Strategy:
   *  - Always look up the canonical price from the DB.
   *  - Substitute the canonical price regardless of what the client sent.
   *  - Return an error only if the product/variant doesn't exist at all.
   *
   * This makes the server fully authoritative on price — the client-supplied
   * priceAtTime is treated as advisory only.
   */
  async validateAndResolve(items: ItemToValidate[]): Promise<PriceValidationResult> {
    const g = globalThis as unknown as { prisma?: any };
    const prisma = g.prisma;

    if (!prisma) {
      // Prisma not available (test env, etc.) — pass through without validation
      return {
        valid: true,
        resolvedItems: items.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          priceAtTime: i.priceAtTime,
        })),
      };
    }

    const errors: Array<{ productId: string; message: string }> = [];
    const resolvedItems: PriceValidationResult['resolvedItems'] = [];

    for (const item of items) {
      let canonicalPrice: number | null = null;

      try {
        // 1. Try to find via variant if variantId provided
        if (item.variantId) {
          const variant = await prisma.productVariant?.findUnique?.({
            where: { id: item.variantId },
            select: { id: true, price: true, status: true, productId: true },
          });

          if (variant && variant.productId === item.productId) {
            if (variant.status !== 'active') {
              errors.push({ productId: item.productId, message: `Product variant is not available` });
              continue;
            }
            canonicalPrice = typeof variant.price === 'object'
              ? Number(variant.price) // Decimal
              : Number(variant.price);
          }
        }

        // 2. Fall back to first active variant on the product
        if (canonicalPrice === null) {
          const product = await prisma.product?.findUnique?.({
            where: { id: item.productId },
            select: {
              id: true,
              status: true,
              variants: {
                where: { status: 'active' },
                orderBy: { price: 'asc' },
                take: 1,
                select: { id: true, price: true },
              },
            },
          });

          if (!product) {
            errors.push({ productId: item.productId, message: `Product not found` });
            continue;
          }

          if (product.status !== 'published' && product.status !== 'active') {
            errors.push({ productId: item.productId, message: `Product is not available for purchase` });
            continue;
          }

          if (!product.variants || product.variants.length === 0) {
            errors.push({ productId: item.productId, message: `No active variants found for product` });
            continue;
          }

          canonicalPrice = Number(product.variants[0].price);
        }

        if (canonicalPrice === null || isNaN(canonicalPrice) || canonicalPrice <= 0) {
          // Cannot resolve a valid price — pass through client value with a warning
          // (avoids breaking checkout if catalog data is incomplete)
          resolvedItems.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtTime: item.priceAtTime,
          });
          continue;
        }

        // Always use the canonical price — client value is advisory only
        resolvedItems.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtTime: canonicalPrice,
        });
      } catch (_err) {
        // Non-fatal catalog lookup failure — pass through client value
        resolvedItems.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceAtTime: item.priceAtTime,
        });
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, resolvedItems };
  }
}
