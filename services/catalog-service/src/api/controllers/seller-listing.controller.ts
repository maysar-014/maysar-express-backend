// @ts-nocheck
/**
 * Seller Listing Controller
 * ENH-005: MSLE seller listing workflow — progressive journey, drafts,
 * validation, and publication (Constitution §12-17).
 *
 * API capability group: Listing (§22)
 * - Start listing
 * - Save listing draft
 * - Retrieve draft
 * - Update listing information
 * - Validate listing
 * - Publish listing
 * - Resume listing
 */

import { Request, Response } from 'express';

export class SellerListingController {
  constructor(private readonly prisma: any) {}

  /**
   * Start a new listing
   * POST /v1/seller/listing/start
   *
   * Body: { entryPath: 'PATH_A' | 'PATH_B', productId?: string }
   * Creates a draft in the 'identify' stage.
   */
  async startListing(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      if (!sellerId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { entryPath = 'PATH_A', productId } = req.body;

      if (!['PATH_A', 'PATH_B'].includes(entryPath)) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'entryPath must be PATH_A or PATH_B' } });
        return;
      }

      const draft = await this.prisma.catalog_ListingDraft.create({
        data: {
          sellerId,
          entryPath,
          currentStage: 'identify',
          productId: entryPath === 'PATH_A' ? productId : null,
          productDraft: entryPath === 'PATH_B' ? {} : null,
          configurationDraft: null,
          offerDraft: null,
          validationResults: null,
          publicationState: 'draft',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          draftId: draft.id,
          entryPath: draft.entryPath,
          currentStage: draft.currentStage,
          productId: draft.productId,
          publicationState: draft.publicationState,
        },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerListingController.startListing error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start listing' } });
    }
  }

  /**
   * Save listing draft (auto-save / manual save)
   * PUT /v1/seller/listing/draft/:id
   *
   * Body: partial draft fields — productDraft, configurationDraft, offerDraft, currentStage
   */
  async saveDraft(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;
      const { productDraft, configurationDraft, offerDraft, currentStage } = req.body;

      const existing = await this.prisma.catalog_ListingDraft.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Draft not found' } });
        return;
      }
      if (existing.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own drafts' } });
        return;
      }
      if (existing.publicationState === 'published') {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Cannot edit a published listing' } });
        return;
      }

      const updateData: any = { updatedAt: new Date() };
      if (productDraft !== undefined) updateData.productDraft = productDraft;
      if (configurationDraft !== undefined) updateData.configurationDraft = configurationDraft;
      if (offerDraft !== undefined) updateData.offerDraft = offerDraft;
      if (currentStage && ['identify', 'describe', 'configure', 'offer', 'publish'].includes(currentStage)) {
        updateData.currentStage = currentStage;
      }

      const updated = await this.prisma.catalog_ListingDraft.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json({
        success: true,
        data: {
          draftId: updated.id,
          currentStage: updated.currentStage,
          publicationState: updated.publicationState,
          updatedAt: updated.updatedAt,
        },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerListingController.saveDraft error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save draft' } });
    }
  }

  /**
   * Retrieve a draft (resume listing)
   * GET /v1/seller/listing/draft/:id
   */
  async getDraft(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;

      const draft = await this.prisma.catalog_ListingDraft.findUnique({ where: { id } });
      if (!draft) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Draft not found' } });
        return;
      }
      if (draft.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own drafts' } });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: draft.id,
          entryPath: draft.entryPath,
          currentStage: draft.currentStage,
          productId: draft.productId,
          productDraft: draft.productDraft,
          configurationDraft: draft.configurationDraft,
          offerDraft: draft.offerDraft,
          validationResults: draft.validationResults,
          publicationState: draft.publicationState,
          publishedOfferId: draft.publishedOfferId,
          publishedProductId: draft.publishedProductId,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerListingController.getDraft error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve draft' } });
    }
  }

  /**
   * List seller's drafts (for resume/recovery)
   * GET /v1/seller/listing/drafts
   */
  async listDrafts(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      if (!sellerId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const drafts = await this.prisma.catalog_ListingDraft.findMany({
        where: { sellerId, publicationState: { in: ['draft', 'validating', 'publishable', 'rejected'] } },
        orderBy: { updatedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: drafts.map((d: any) => ({
          id: d.id,
          entryPath: d.entryPath,
          currentStage: d.currentStage,
          productId: d.productId,
          publicationState: d.publicationState,
          updatedAt: d.updatedAt,
        })),
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerListingController.listDrafts error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list drafts' } });
    }
  }

  /**
   * Validate a listing draft
   * POST /v1/seller/listing/:id/validate
   *
   * Runs all validation checks and stores results. Does not publish.
   */
  async validateListing(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;

      const draft = await this.prisma.catalog_ListingDraft.findUnique({ where: { id } });
      if (!draft) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Draft not found' } });
        return;
      }
      if (draft.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only validate your own drafts' } });
        return;
      }

      const errors: any[] = [];
      const warnings: any[] = [];

      // ── Stage-dependent validation ──────────────────────────────────────────
      const offerDraft = draft.offerDraft ? (typeof draft.offerDraft === 'string' ? JSON.parse(draft.offerDraft) : draft.offerDraft) : null;
      const productDraft = draft.productDraft ? (typeof draft.productDraft === 'string' ? JSON.parse(draft.productDraft) : draft.productDraft) : null;
      const configDraft = draft.configurationDraft ? (typeof draft.configurationDraft === 'string' ? JSON.parse(draft.configurationDraft) : draft.configurationDraft) : null;

      // Product identity checks
      if (draft.entryPath === 'PATH_A' && !draft.productId) {
        errors.push({ field: 'productId', message: 'A catalog product must be selected for Path A', severity: 'error' });
      }

      if (draft.entryPath === 'PATH_B' && productDraft) {
        if (!productDraft.title) {
          errors.push({ field: 'title', message: 'Product name is required', severity: 'error' });
        }
        if (!productDraft.categoryId) {
          errors.push({ field: 'categoryId', message: 'Category is required', severity: 'error' });
        }
        if (!productDraft.description) {
          warnings.push({ field: 'description', message: 'A description is recommended for better visibility', severity: 'warning' });
        }
      }

      // Offer checks (Stage 4 — §13)
      if (offerDraft) {
        if (!offerDraft.price || offerDraft.price <= 0) {
          errors.push({ field: 'price', message: 'A valid selling price is required', severity: 'error' });
        }
        if (offerDraft.stockAvailable === undefined || offerDraft.stockAvailable < 0) {
          errors.push({ field: 'stockAvailable', message: 'Stock or availability must be specified', severity: 'error' });
        }
        if (!offerDraft.condition) {
          warnings.push({ field: 'condition', message: 'Product condition is recommended', severity: 'warning' });
        }
      } else {
        errors.push({ field: 'offer', message: 'Offer details must be set up before publishing', severity: 'error' });
      }

      // Configuration validation (if configuration draft exists)
      if (configDraft && draft.productId) {
        try {
          const { ConfigurationValidationPolicy } = require('../../domain/policies/configuration-validation.policy');
          const definition = await this.prisma.catalog_ConfigurationDefinition?.findFirst({
            where: { productId: draft.productId, status: 'active' },
          });

          if (definition) {
            const dimensions = typeof definition.dimensions === 'string' ? JSON.parse(definition.dimensions) : definition.dimensions;
            const options = typeof definition.options === 'string' ? JSON.parse(definition.options) : definition.options;
            const dependencies = typeof definition.dependencies === 'string' ? JSON.parse(definition.dependencies) : definition.dependencies;
            const constraints = typeof definition.constraints === 'string' ? JSON.parse(definition.constraints) : definition.constraints;
            const combinations = await this.prisma.catalog_ConfigurationCombination?.findMany({
              where: { configurationDefinitionId: definition.id },
            }) ?? [];

            const defData = {
              id: definition.id, productId: definition.productId, version: definition.version,
              status: definition.status, dimensions, options, dependencies, constraints,
              combinations: combinations.map((c: any) => ({
                id: c.id, configurationDefinitionId: definition.id,
                optionSelections: typeof c.optionSelections === 'string' ? JSON.parse(c.optionSelections) : c.optionSelections,
                fingerprint: c.fingerprint, active: c.active,
              })),
              predecessorVersionId: definition.predecessorVersionId,
              createdAt: definition.createdAt?.toISOString?.() ?? definition.createdAt,
              updatedAt: definition.updatedAt?.toISOString?.() ?? definition.updatedAt,
            };

            const configResult = ConfigurationValidationPolicy.validate(configDraft.selections || {}, defData);
            if (!configResult.valid) {
              for (const err of configResult.errors) {
                errors.push({ field: 'configuration', message: err.message, severity: 'error' });
              }
            }
          }
        } catch (e) {
          warnings.push({ field: 'configuration', message: 'Configuration validation could not be performed', severity: 'warning' });
        }
      }

      const isValid = errors.length === 0;
      const publicationState = isValid ? 'publishable' : 'validating';

      const validationResults = { errors, warnings, isValid, validatedAt: new Date().toISOString() };

      const updated = await this.prisma.catalog_ListingDraft.update({
        where: { id },
        data: { validationResults, publicationState, updatedAt: new Date() },
      });

      res.status(200).json({
        success: true,
        data: {
          draftId: id,
          valid: isValid,
          errors,
          warnings,
          publicationState: updated.publicationState,
        },
        meta: { timestamp: new Date() },
      });
    } catch (error) {
      console.error('SellerListingController.validateListing error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to validate listing' } });
    }
  }

  /**
   * Publish a listing
   * POST /v1/seller/listing/:id/publish
   *
   * Validates → creates/links product (Path B) → creates seller offer → records publication
   */
  async publishListing(req: Request, res: Response): Promise<void> {
    try {
      const sellerId = (req as any).user?.userId || (req as any).user?.id;
      const { id } = req.params;

      const draft = await this.prisma.catalog_ListingDraft.findUnique({ where: { id } });
      if (!draft) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Draft not found' } });
        return;
      }
      if (draft.sellerId !== sellerId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only publish your own drafts' } });
        return;
      }
      if (draft.publicationState === 'published') {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Listing is already published' } });
        return;
      }

      // Re-run validation
      const offerDraft = draft.offerDraft ? (typeof draft.offerDraft === 'string' ? JSON.parse(draft.offerDraft) : draft.offerDraft) : null;
      const productDraft = draft.productDraft ? (typeof draft.productDraft === 'string' ? JSON.parse(draft.productDraft) : draft.productDraft) : null;

      const errors: string[] = [];
      if (!offerDraft || !offerDraft.price || offerDraft.price <= 0) {
        errors.push('A valid selling price is required');
      }
      if (draft.entryPath === 'PATH_B' && (!productDraft || !productDraft.title || !productDraft.categoryId)) {
        errors.push('Product name and category are required for new products');
      }
      if (draft.entryPath === 'PATH_A' && !draft.productId) {
        errors.push('A catalog product must be selected');
      }

      if (errors.length > 0) {
        await this.prisma.catalog_ListingDraft.update({
          where: { id },
          data: { publicationState: 'rejected', validationResults: { errors: errors.map(m => ({ message: m, severity: 'error' })), isValid: false }, updatedAt: new Date() },
        });

        // Record rejection
        await this.prisma.catalog_ListingPublicationRecord.create({
          data: { draftId: id, sellerId, action: 'rejected', validationErrors: errors },
        });

        res.status(422).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Listing cannot be published', details: errors },
        });
        return;
      }

      // ── Execute publication ──────────────────────────────────────────────
      let publishedProductId = draft.productId;
      let publishedOfferId: string | null = null;

      // Path B: Create the product (simplified — uses existing product creation flow)
      if (draft.entryPath === 'PATH_B' && !publishedProductId && productDraft) {
        // Product creation is handled by the existing product creation use case.
        // Here we store the draft data for the frontend to submit via the product creation API.
        // This is a transitional approach — the orchestrator would handle this fully in a complete implementation.
        publishedProductId = null; // Will be set by product creation flow
      }

      // Create seller offer
      if (offerDraft) {
        const { SellerOffer } = require('../../domain/entities/seller-offer.entity');

        const offer = SellerOffer.create(
          publishedProductId || draft.productId,
          sellerId,
          offerDraft.price,
          offerDraft.currency || 'TZS',
        );
        if (offerDraft.stockAvailable !== undefined) offer.updateStock(offerDraft.stockAvailable);
        if (offerDraft.condition) (offer as any).condition = offerDraft.condition;
        if (offerDraft.fulfillmentPolicy) (offer as any).fulfillmentPolicy = offerDraft.fulfillmentPolicy;
        if (offerDraft.warranty !== undefined) (offer as any).warranty = offerDraft.warranty;
        if (offerDraft.returnConditions !== undefined) (offer as any).returnConditions = offerDraft.returnConditions;
        if (offerDraft.minimumOrderQuantity) (offer as any).minimumOrderQuantity = offerDraft.minimumOrderQuantity;
        if (offerDraft.leadTimeDays) (offer as any).leadTimeDays = offerDraft.leadTimeDays;
        if (offerDraft.configurationCoverage) offer.setConfigurationCoverage(offerDraft.configurationCoverage);

        // Transition to active if requested
        if (offerDraft.autoActivate) {
          offer.transitionTo('active');
        }

        const offerData = offer.toJSON();

        const savedOffer = await this.prisma.catalog_SellerOffer.create({
          data: {
            id: offerData.id,
            productId: offerData.productId,
            sellerId: offerData.sellerId,
            sellerSku: offerData.sellerSku,
            price: offerData.price,
            currency: offerData.currency,
            stockAvailable: offerData.stockAvailable,
            condition: offerData.condition,
            fulfillmentPolicy: offerData.fulfillmentPolicy,
            warranty: offerData.warranty,
            returnConditions: offerData.returnConditions,
            minimumOrderQuantity: offerData.minimumOrderQuantity,
            leadTimeDays: offerData.leadTimeDays,
            status: offerData.status,
            configurationCoverage: offerData.configurationCoverage ? JSON.stringify(offerData.configurationCoverage) : null,
          },
        });

        publishedOfferId = savedOffer.id;
      }

      // Update draft state
      await this.prisma.catalog_ListingDraft.update({
        where: { id },
        data: {
          publicationState: 'published',
          publishedOfferId,
          publishedProductId,
          currentStage: 'publish',
          updatedAt: new Date(),
        },
      });

      // Record publication
      await this.prisma.catalog_ListingPublicationRecord.create({
        data: {
          draftId: id,
          sellerId,
          productId: publishedProductId,
          offerId: publishedOfferId,
          action: 'published',
          summary: {
            entryPath: draft.entryPath,
            offerPrice: offerDraft?.price,
            offerCurrency: offerDraft?.currency,
            offerCondition: offerDraft?.condition,
            stockAvailable: offerDraft?.stockAvailable,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: {
          draftId: id,
          publicationState: 'published',
          publishedOfferId,
          publishedProductId,
        },
        meta: { timestamp: new Date() },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'An offer for this product already exists for this seller' } });
        return;
      }
      console.error('SellerListingController.publishListing error:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to publish listing' } });
    }
  }
}
