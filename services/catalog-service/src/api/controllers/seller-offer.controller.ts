// @ts-nocheck
/**
 * Seller Offer Controller
 * ENH-009: API layer for seller offer CRUD operations.
 *
 * Constitution §22-23: Offers API capability group.
 */

import { Request, Response } from 'express';
import { SellerOffer, SellerOfferStatus, ProductCondition, FulfillmentPolicy } from '../../domain/entities/seller-offer.entity';

export class SellerOfferController {
  constructor(private readonly prisma: any) {}

  /**
   * Create seller offer
   * POST /v1/seller/offers
   */
  async createOffer(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      if (!sellerId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { productId, sellerSku, price, currency, stockAvailable, condition, fulfillmentPolicy, warranty, returnConditions, minimumOrderQuantity, leadTimeDays, configurationCoverage } = req.body;

      if (!productId || !price || price <= 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'productId and a valid price are required' } });
        return;
      }

      // Check for existing offer on this product+seller
      const existing = await this.prisma.catalog_SellerOffer?.findUnique({
        where: { productId_sellerId: { productId, sellerId } },
      });
      if (existing) {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'An offer for this product already exists for this seller' } });
        return;
      }

      const offer = SellerOffer.create(productId, sellerId, price, currency || 'TZS');
      if (sellerSku) {
        // Set seller SKU via internal access (entity doesn't expose setter for SKU)
        (offer as any).sellerSku = sellerSku;
      }
      if (stockAvailable !== undefined) offer.updateStock(stockAvailable);
      if (condition) (offer as any).condition = condition;
      if (fulfillmentPolicy) (offer as any).fulfillmentPolicy = fulfillmentPolicy;
      if (warranty !== undefined) (offer as any).warranty = warranty;
      if (returnConditions !== undefined) (offer as any).returnConditions = returnConditions;
      if (minimumOrderQuantity) (offer as any).minimumOrderQuantity = minimumOrderQuantity;
      if (leadTimeDays) (offer as any).leadTimeDays = leadTimeDays;
      if (configurationCoverage) offer.setConfigurationCoverage(configurationCoverage);

      const data = offer.toJSON();

      // Persist
      const saved = await this.prisma.catalog_SellerOffer?.create({
        data: {
          id: data.id,
          productId: data.productId,
          sellerId: data.sellerId,
          sellerSku: data.sellerSku,
          price: data.price,
          currency: data.currency,
          stockAvailable: data.stockAvailable,
          condition: data.condition,
          fulfillmentPolicy: data.fulfillmentPolicy,
          warranty: data.warranty,
          returnConditions: data.returnConditions,
          minimumOrderQuantity: data.minimumOrderQuantity,
          leadTimeDays: data.leadTimeDays,
          status: data.status,
          configurationCoverage: data.configurationCoverage ? JSON.stringify(data.configurationCoverage) : null,
        },
      });

      res.status(201).json({
        success: true,
        data: { offerId: data.id, status: data.status },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerOfferController.createOffer error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create offer' } });
    }
  }

  /**
   * Get seller's offers
   * GET /v1/seller/offers
   */
  async getMyOffers(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      if (!sellerId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const offers = await this.prisma.catalog_SellerOffer?.findMany({
        where: { sellerId },
        orderBy: { updatedAt: 'desc' },
      }) ?? [];

      res.status(200).json({
        success: true,
        data: offers.map((o: any) => ({
          id: o.id,
          productId: o.productId,
          sellerSku: o.sellerSku,
          price: Number(o.price),
          currency: o.currency,
          stockAvailable: o.stockAvailable,
          condition: o.condition,
          fulfillmentPolicy: o.fulfillmentPolicy,
          warranty: o.warranty,
          returnConditions: o.returnConditions,
          minimumOrderQuantity: o.minimumOrderQuantity,
          leadTimeDays: o.leadTimeDays,
          status: o.status,
          configurationCoverage: o.configurationCoverage ? (typeof o.configurationCoverage === 'string' ? JSON.parse(o.configurationCoverage) : o.configurationCoverage) : null,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        })),
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerOfferController.getMyOffers error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve offers' } });
    }
  }

  /**
   * Get active offers for a product
   * GET /v1/products/:productId/offers
   */
  async getActiveOffers(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const offers = await this.prisma.catalog_SellerOffer?.findMany({
        where: { productId, status: 'active' },
        orderBy: { price: 'asc' },
      }) ?? [];

      res.status(200).json({
        success: true,
        data: offers.map((o: any) => ({
          id: o.id,
          sellerId: o.sellerId,
          price: Number(o.price),
          currency: o.currency,
          stockAvailable: o.stockAvailable,
          condition: o.condition,
          fulfillmentPolicy: o.fulfillmentPolicy,
          leadTimeDays: o.leadTimeDays,
          minimumOrderQuantity: o.minimumOrderQuantity,
        })),
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerOfferController.getActiveOffers error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve offers' } });
    }
  }

  /**
   * Update offer status
   * PATCH /v1/seller/offers/:id/status
   */
  async updateOfferStatus(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;
      const { status } = req.body;

      const offer = await this.prisma.catalog_SellerOffer?.findUnique({ where: { id } });
      if (!offer) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
        return;
      }
      if (offer.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own offers' } });
        return;
      }

      // Validate transition using the domain entity
      const domainOffer = SellerOffer.fromJSON({
        id: offer.id,
        productId: offer.productId,
        sellerId: offer.sellerId,
        sellerSku: offer.sellerSku,
        price: Number(offer.price),
        currency: offer.currency,
        stockAvailable: offer.stockAvailable,
        condition: offer.condition,
        fulfillmentPolicy: offer.fulfillmentPolicy,
        warranty: offer.warranty,
        returnConditions: offer.returnConditions,
        minimumOrderQuantity: offer.minimumOrderQuantity,
        leadTimeDays: offer.leadTimeDays,
        status: offer.status,
        configurationCoverage: offer.configurationCoverage ? (typeof offer.configurationCoverage === 'string' ? JSON.parse(offer.configurationCoverage) : offer.configurationCoverage) : null,
        createdAt: offer.createdAt?.toISOString?.() ?? offer.createdAt,
        updatedAt: offer.updatedAt?.toISOString?.() ?? offer.updatedAt,
      });

      domainOffer.transitionTo(status);

      await this.prisma.catalog_SellerOffer?.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        data: { offerId: id, status },
        meta: { timestamp: new Date() },
      });
    } catch (error: any) {
      if (error?.code === 'INVALID_STATUS_TRANSITION' || error?.code === 'INVALID_PRICE' || error?.code === 'ARCHIVED_OFFER') {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      console.error('SellerOfferController.updateOfferStatus error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update offer status' } });
    }
  }

  /**
   * Update offer price
   * PATCH /v1/seller/offers/:id/price
   */
  async updateOfferPrice(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;
      const { price, currency } = req.body;

      if (!price || price <= 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid price is required' } });
        return;
      }

      const offer = await this.prisma.catalog_SellerOffer?.findUnique({ where: { id } });
      if (!offer) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
        return;
      }
      if (offer.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own offers' } });
        return;
      }

      // Reconstruct domain entity for validation
      const domainOffer = SellerOffer.fromJSON({
        id: offer.id, productId: offer.productId, sellerId: offer.sellerId,
        sellerSku: offer.sellerSku, price: Number(offer.price), currency: offer.currency,
        stockAvailable: offer.stockAvailable, condition: offer.condition,
        fulfillmentPolicy: offer.fulfillmentPolicy, warranty: offer.warranty,
        returnConditions: offer.returnConditions, minimumOrderQuantity: offer.minimumOrderQuantity,
        leadTimeDays: offer.leadTimeDays, status: offer.status,
        configurationCoverage: offer.configurationCoverage ? (typeof offer.configurationCoverage === 'string' ? JSON.parse(offer.configurationCoverage) : offer.configurationCoverage) : null,
        createdAt: offer.createdAt?.toISOString?.() ?? offer.createdAt,
        updatedAt: offer.updatedAt?.toISOString?.() ?? offer.updatedAt,
      });

      domainOffer.updatePrice(price, currency);

      await this.prisma.catalog_SellerOffer?.update({
        where: { id },
        data: { price, currency: currency || offer.currency, updatedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        data: { offerId: id, price, currency: currency || offer.currency },
        meta: { timestamp: new Date() },
      });
    } catch (error: any) {
      if (error?.code === 'INVALID_PRICE' || error?.code === 'ARCHIVED_OFFER') {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      console.error('SellerOfferController.updateOfferPrice error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update offer price' } });
    }
  }

  /**
   * Update offer stock
   * PATCH /v1/seller/offers/:id/stock
   */
  async updateOfferStock(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;
      const { stockAvailable } = req.body;

      if (stockAvailable === undefined || stockAvailable < 0) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A non-negative stock value is required' } });
        return;
      }

      const offer = await this.prisma.catalog_SellerOffer?.findUnique({ where: { id } });
      if (!offer) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } });
        return;
      }
      if (offer.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only update your own offers' } });
        return;
      }

      await this.prisma.catalog_SellerOffer?.update({
        where: { id },
        data: { stockAvailable, updatedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        data: { offerId: id, stockAvailable },
        meta: { timestamp: new Date() },
      });
    } catch (error: any) {
      if (error?.code === 'INVALID_STOCK' || error?.code === 'ARCHIVED_OFFER') {
        res.status(400).json({ success: false, error: { code: error.code, message: error.message } });
        return;
      }
      console.error('SellerOfferController.updateOfferStock error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update offer stock' } });
    }
  }
}
