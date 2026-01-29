import { Request, Response } from 'express';
import { ICartRepository } from '../../infrastructure/repositories/cart.repository';
import { Cart } from '../../domain/value-objects/cart.value-object';
import { CheckoutMapper } from '../../application/mappers/checkout.mapper';

export class CartController {
  constructor(private cartRepository: ICartRepository) {}

  async addToCart(req: Request, res: Response): Promise<void> {
    try {
      const { cartId, userId, productId, variantId, quantity, priceAtTime } = req.body;

      const cartData = await this.cartRepository.getById(cartId);
      const cart = new Cart({ items: cartData?.items || [] });
      
      const updated = cart.addItem({
        productId,
        variantId,
        quantity,
        priceAtTime
      });

      await this.cartRepository.save(cartId, userId, updated);

      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(updated, cartId, userId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item'
      });
    }
  }

  async removeFromCart(req: Request, res: Response): Promise<void> {
    try {
      const { cartId, userId, productId, variantId } = req.body;

      const cartData = await this.cartRepository.getById(cartId);
      const cart = new Cart({ items: cartData?.items || [] });
      
      const updated = cart.removeItem(productId, variantId);

      await this.cartRepository.save(cartId, userId, updated);

      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(updated, cartId, userId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove item'
      });
    }
  }

  async updateQuantity(req: Request, res: Response): Promise<void> {
    try {
      const { cartId, userId, productId, variantId, quantity } = req.body;

      const cartData = await this.cartRepository.getById(cartId);
      const cart = new Cart({ items: cartData?.items || [] });
      
      const updated = cart.updateItemQuantity(productId, quantity, variantId);

      await this.cartRepository.save(cartId, userId, updated);

      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(updated, cartId, userId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update quantity'
      });
    }
  }

  async getCart(req: Request, res: Response): Promise<void> {
    try {
      const { cartId, userId } = req.params;

      const cartData = await this.cartRepository.getById(cartId);
      if (!cartData) {
        res.status(404).json({ success: false, error: 'Cart not found' });
        return;
      }

      const cart = new Cart({ items: cartData.items });
      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cart, cartId, userId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get cart'
      });
    }
  }

  async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const { cartId, userId } = req.body;

      const cleared = new Cart({ items: [] });
      await this.cartRepository.save(cartId, userId, cleared);

      res.json({
        success: true,
        data: CheckoutMapper.cartToDTO(cleared, cartId, userId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart'
      });
    }
  }
}
