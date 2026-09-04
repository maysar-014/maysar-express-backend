/**
 * Cart Controller
 *
 * Handles HTTP requests for cart operations.
 * API layer - request/response handling.
 */

import { Request, Response } from 'express';
import { Cart } from '../../domain/value-objects/cart.value-object';
import {
  isContractAwareUserId,
  isValidCartId,
  validateCartMergeRequest,
  validateCartRemoveRequest,
  validateCartRequest,
  validateCartUpdateRequest
} from '../../shared/validators';
import { AppError, ValidationError } from '../../shared/errors/app.error';
import { logger } from '../../shared/logger/logger';
import { CheckoutMapper } from '../../application/mappers/checkout.mapper';
import { makeId } from '@shared/ids/id';

export class CartController {
  constructor(private cartRepository: any) {}

  private assertNoUnknownBodyFields(body: unknown, allowedKeys: readonly string[]): Record<string, unknown> {
    if (body === null || body === undefined) {
      return {};
    }

    if (typeof body !== 'object' || Array.isArray(body)) {
      throw new ValidationError('Request body must be an object');
    }

    const candidate = body as Record<string, unknown>;
    const unknownKeys = Object.keys(candidate).filter((key) => !allowedKeys.includes(key));
    if (unknownKeys.length > 0) {
      throw new ValidationError('Request body contains unsupported fields', {
        unknownFields: unknownKeys
      });
    }

    return candidate;
  }

  private getAuthenticatedUserId(req: Request): string | undefined {
    const authUser = (req as any).user;
    const bodyUserId = typeof req.body?.userId === 'string' ? req.body.userId : undefined;
    const queryUserId = typeof req.query?.userId === 'string' ? req.query.userId : undefined;
    const headerUserId = typeof req.headers['x-user-id'] === 'string'
      ? req.headers['x-user-id']
      : Array.isArray(req.headers['x-user-id'])
        ? req.headers['x-user-id'][0]
        : undefined;

    return authUser?.userId || (req as any).userId || bodyUserId || queryUserId || headerUserId;
  }

  private async getCartById(cartId: string) {
    if (typeof this.cartRepository.getById === 'function') {
      return this.cartRepository.getById(cartId);
    }

    if (typeof this.cartRepository.getCart === 'function') {
      return this.cartRepository.getCart(cartId);
    }

    throw new Error('Cart repository does not support cart lookup');
  }

  private async getCartByUserId(userId: string) {
    if (typeof this.cartRepository.getByUserId === 'function') {
      return this.cartRepository.getByUserId(userId);
    }

    if (typeof this.cartRepository.findByUserId === 'function') {
      return this.cartRepository.findByUserId(userId);
    }

    throw new Error('Cart repository does not support current cart lookup');
  }

  private async saveCart(cartId: string, userId: string, cart: Cart): Promise<void> {
    if (typeof this.cartRepository.save === 'function') {
      await this.cartRepository.save(cartId, userId, cart);
      return;
    }

    if (typeof this.cartRepository.saveCart === 'function') {
      await this.cartRepository.saveCart(cartId, userId, cart);
      return;
    }

    throw new Error('Cart repository does not support cart persistence');
  }

  private async deleteCart(cartId: string): Promise<void> {
    if (typeof this.cartRepository.delete === 'function') {
      await this.cartRepository.delete(cartId);
      return;
    }

    if (typeof this.cartRepository.deleteCart === 'function') {
      await this.cartRepository.deleteCart(cartId);
      return;
    }

    throw new Error('Cart repository does not support cart deletion');
  }

  private async resolveOrCreateCurrentCart(userId: string) {
    const existingCart = await this.getCartByUserId(userId);
    if (existingCart) {
      return {
        cartId: existingCart.id,
        userId: existingCart.userId,
        cart: new Cart({ id: existingCart.id, userId: existingCart.userId, items: existingCart.items })
      };
    }

    const cartId = makeId('chk_cart');
    const cart = new Cart({ id: cartId, userId, items: [] });
    await this.saveCart(cartId, userId, cart);

    return { cartId, userId, cart };
  }

  async addToCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    let body: Record<string, unknown> = {};
    try {
      body = this.assertNoUnknownBodyFields(req.body, ['cartId', 'userId', 'productId', 'variantId', 'quantity', 'priceAtTime']);
      let { cartId, userId, productId, variantId, quantity, priceAtTime } = body;

      // Auto-resolve cartId and userId from auth context when not provided
      // This allows the test harness to call POST /api/cart/items without pre-fetching cart
      const authenticatedUserId = this.getAuthenticatedUserId(req);
      if (!userId && authenticatedUserId) {
        userId = authenticatedUserId;
      }
      if (!cartId && userId) {
        const resolvedCart = await this.resolveOrCreateCurrentCart(userId as string);
        cartId = resolvedCart.cartId;
      }

      validateCartRequest({ cartId, userId, productId, variantId, quantity, priceAtTime });
      const validatedCartId = cartId as string;
      const validatedUserId = userId as string;
      const validatedProductId = productId as string;
      const validatedVariantId = variantId as string | undefined;
      const normalizedQuantity = Number(quantity);
      const normalizedPriceAtTime = Number(priceAtTime);

      const existingCart = await this.getCartById(validatedCartId);
      let cart = existingCart
        ? new Cart({ id: validatedCartId, userId: existingCart.userId, items: existingCart.items })
        : new Cart({ id: validatedCartId, userId: validatedUserId, items: [] });

      cart = cart.addItem({
        productId: validatedProductId,
        variantId: validatedVariantId,
        quantity: normalizedQuantity,
        priceAtTime: normalizedPriceAtTime
      });
      await this.saveCart(validatedCartId, validatedUserId, cart);

      logger.info('Item added to cart', { cartId: validatedCartId, productId: validatedProductId, quantity: normalizedQuantity }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, validatedCartId, validatedUserId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const code = error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR';
      logger.error('Error adding to cart', error as Error, { cartId: body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code,
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }

  async removeFromCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    let body: Record<string, unknown> = {};
    try {
      body = this.assertNoUnknownBodyFields(req.body, ['cartId', 'userId', 'productId', 'variantId']);
      const { cartId, userId, productId, variantId } = body;

      validateCartRemoveRequest({ cartId, userId, productId, variantId });
      const validatedCartId = cartId as string;
      const validatedProductId = productId as string;
      const validatedVariantId = variantId as string | undefined;

      const existingCart = await this.getCartById(validatedCartId);
      if (!existingCart) {
        logger.warn('Cart not found', { cartId: validatedCartId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
          timestamp: new Date()
        });
        return;
      }

      const resolvedUserId = (userId as string | undefined) || existingCart.userId;
      let cart = new Cart({ id: validatedCartId, userId: existingCart.userId, items: existingCart.items });
      cart = cart.removeItem(validatedProductId, validatedVariantId);
      await this.saveCart(validatedCartId, resolvedUserId, cart);

      logger.info('Item removed from cart', { cartId: validatedCartId, productId: validatedProductId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, validatedCartId, resolvedUserId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error removing from cart', error as Error, { cartId: body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }

  async updateCartItem(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    let body: Record<string, unknown> = {};
    try {
      body = this.assertNoUnknownBodyFields(req.body, ['cartId', 'userId', 'productId', 'variantId', 'quantity']);
      const { cartId, userId, productId, variantId, quantity } = body;

      validateCartUpdateRequest({ cartId, userId, productId, variantId, quantity });
      const validatedCartId = cartId as string;
      const validatedProductId = productId as string;
      const validatedVariantId = variantId as string | undefined;
      const normalizedQuantity = Number(quantity);

      const existingCart = await this.getCartById(validatedCartId);
      if (!existingCart) {
        logger.warn('Cart not found for update', { cartId: validatedCartId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
          timestamp: new Date()
        });
        return;
      }

      const resolvedUserId = (userId as string | undefined) || existingCart.userId;
      let cart = new Cart({ id: validatedCartId, userId: existingCart.userId, items: existingCart.items });
      cart = cart.updateItemQuantity(validatedProductId, normalizedQuantity, validatedVariantId);
      await this.saveCart(validatedCartId, resolvedUserId, cart);

      logger.info('Cart item quantity updated', { cartId: validatedCartId, productId: validatedProductId, quantity: normalizedQuantity }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, validatedCartId, resolvedUserId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error updating cart item', error as Error, { cartId: body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }

  async getCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const { cartId } = req.params;
      if (!isValidCartId(cartId)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CART_ID', message: 'Cart ID must be a valid cart ID' },
          timestamp: new Date()
        });
        return;
      }
      const cartData = await this.getCartById(cartId);

      if (!cartData) {
        logger.warn('Cart not found', { cartId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CART_NOT_FOUND', message: 'Cart not found' },
          timestamp: new Date()
        });
        return;
      }

      const cart = new Cart({ id: cartId, userId: cartData.userId, items: cartData.items });
      const userId = (req as any).userId || cartData.userId;

      logger.info('Cart retrieved', { cartId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error retrieving cart', error as Error, { cartId: req.params.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }

  async getCurrentCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    try {
      const userId = this.getAuthenticatedUserId(req);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date()
        });
        return;
      }

      const { cartId, cart } = await this.resolveOrCreateCurrentCart(userId);

      logger.info('Current cart resolved', { cartId, userId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error resolving current cart', error as Error, undefined, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }

  async clearCart(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    let body: Record<string, unknown> = {};
    const params = req.params ?? {};
    try {
      body = this.assertNoUnknownBodyFields(req.body, ['userId']);
      const cartId = params.cartId;
      const existingCart = isValidCartId(cartId) ? await this.getCartById(cartId) : null;
      const hasUserIdInBody = Object.prototype.hasOwnProperty.call(body, 'userId');
      const userId = hasUserIdInBody ? body.userId : existingCart?.userId;

      if (!isValidCartId(cartId)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CART_ID', message: 'Cart ID must be a valid cart ID' },
          timestamp: new Date()
        });
        return;
      }

      if (!isContractAwareUserId(userId)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_USER_ID', message: 'User ID must be a valid ID' },
          timestamp: new Date()
        });
        return;
      }

      const cart = new Cart({ id: cartId, userId, items: [] });
      await this.saveCart(cartId, userId, cart);

      logger.info('Cart cleared', { cartId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error clearing cart', error as Error, { cartId: body.cartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      });
    }
  }

  async mergeCarts(req: Request, res: Response): Promise<void> {
    const correlationId = req.headers['x-correlation-id'] as string;
    const body = req.body ?? {};
    try {
      const { sourceCartId, targetCartId, userId } = body;

      validateCartMergeRequest({ sourceCartId, targetCartId, userId });

      const sourceCartData = await this.getCartById(sourceCartId);
      if (!sourceCartData) {
        logger.warn('Source cart not found for merge', { sourceCartId, targetCartId }, correlationId);
        res.status(404).json({
          success: false,
          error: { code: 'CART_NOT_FOUND', message: 'Source cart not found' },
          timestamp: new Date()
        });
        return;
      }

      const targetCartData = sourceCartId === targetCartId
        ? sourceCartData
        : await this.getCartById(targetCartId);

      let mergedCart = new Cart({
        id: targetCartId,
        userId,
        items: targetCartData?.items || []
      });

      for (const item of sourceCartData.items) {
        mergedCart = mergedCart.addItem(item);
      }

      await this.saveCart(targetCartId, userId, mergedCart);

      if (sourceCartId !== targetCartId) {
        try {
          await this.deleteCart(sourceCartId);
        } catch (_error) {
          logger.warn('Merged cart but could not delete source cart', { sourceCartId, targetCartId }, correlationId);
        }
      }

      logger.info('Carts merged', { sourceCartId, targetCartId }, correlationId);
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(mergedCart, targetCartId, userId),
        timestamp: new Date()
      });
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      logger.error('Error merging carts', error as Error, { sourceCartId: body.sourceCartId }, correlationId);
      res.status(statusCode).json({
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof AppError ? error.details : undefined
        },
        timestamp: new Date()
      });
    }
  }
}
