/**
 * CampaignEnrichmentService
 *
 * Enriches product search/listing results with active campaign data.
 * A single batch query fetches all active campaigns covering the given
 * product IDs (direct product match OR category match), then computes
 * the effective discounted price for each product.
 *
 * Design decisions:
 * - One query per result page (not per product) — O(1) DB round-trips.
 * - Non-fatal: if the query fails, products are returned without campaign data.
 * - Category-level campaigns are resolved by joining Campaign_Category.
 * - When multiple campaigns cover the same product, the one with the highest
 *   discount value wins (best-deal-first policy).
 */

import { PrismaClient } from '@prisma/client';
import type { ProductCampaignDto } from '../../application/dto/product.dto';

interface ProductForEnrichment {
  id: string;
  categoryId?: string;
  price?: { amount: number; currency: string };
}

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  productId: string | null;
  categoryId: string | null;
  originalPrice: unknown;
  campaignPrice: unknown;
  ruleType: string;
  ruleValue: number;
  endDate: Date | null;
}

export class CampaignEnrichmentService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Returns a Map<productId, ProductCampaignDto> for all products
   * that are covered by at least one active campaign right now.
   */
  async fetchActiveCampaigns(
    products: ProductForEnrichment[],
  ): Promise<Map<string, ProductCampaignDto>> {
    if (products.length === 0) return new Map();

    const productIds = products.map((p) => p.id).filter(Boolean);
    const categoryIds = [...new Set(products.map((p) => p.categoryId).filter(Boolean))] as string[];
    const now = new Date();

    try {
      // Fetch active campaigns that cover these products directly
      const directRows = await (this.prisma as any).campaign_Product.findMany({
        where: {
          productId: { in: productIds },
          campaign: {
            status: 'ACTIVE',
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        },
        include: {
          campaign: {
            include: { pricingRules: { orderBy: { priority: 'desc' }, take: 1 } },
          },
        },
      });

      // Fetch active campaigns that cover these categories
      const categoryRows = categoryIds.length > 0
        ? await (this.prisma as any).campaign_Category.findMany({
            where: {
              categoryId: { in: categoryIds },
              campaign: {
                status: 'ACTIVE',
                startDate: { lte: now },
                OR: [{ endDate: null }, { endDate: { gte: now } }],
              },
            },
            include: {
              campaign: {
                include: { pricingRules: { orderBy: { priority: 'desc' }, take: 1 } },
              },
            },
          })
        : [];

      // Build a map of productId → best campaign
      const result = new Map<string, ProductCampaignDto>();

      // Process direct product campaigns
      for (const row of directRows) {
        const product = products.find((p) => p.id === row.productId);
        if (!product) continue;
        const dto = this.buildCampaignDto(row.campaign, row.originalPrice, row.campaignPrice, product);
        if (!dto) continue;
        this.applyBestDeal(result, row.productId, dto);
      }

      // Process category-level campaigns — apply to all products in that category
      for (const row of categoryRows) {
        const affectedProducts = products.filter((p) => p.categoryId === row.categoryId);
        for (const product of affectedProducts) {
          // Skip if product already has a direct campaign (direct takes precedence unless category gives better deal)
          const dto = this.buildCampaignDtoFromCategory(row.campaign, product);
          if (!dto) continue;
          this.applyBestDeal(result, product.id, dto);
        }
      }

      return result;
    } catch {
      // Non-fatal — return empty map, products render without campaign badge
      return new Map();
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildCampaignDto(
    campaign: any,
    originalPriceJson: unknown,
    campaignPriceJson: unknown,
    product: ProductForEnrichment,
  ): ProductCampaignDto | null {
    const rule = campaign.pricingRules?.[0];
    if (!rule) return null;

    const originalAmount = this.extractAmount(originalPriceJson) ?? product.price?.amount ?? 0;
    const campaignAmount = this.extractAmount(campaignPriceJson);
    const currency = product.price?.currency ?? 'TZS';

    return this.computeDto(campaign, rule, originalAmount, campaignAmount, currency);
  }

  private buildCampaignDtoFromCategory(
    campaign: any,
    product: ProductForEnrichment,
  ): ProductCampaignDto | null {
    const rule = campaign.pricingRules?.[0];
    if (!rule || !product.price) return null;

    const originalAmount = product.price.amount;
    const currency = product.price.currency;

    return this.computeDto(campaign, rule, originalAmount, null, currency);
  }

  private computeDto(
    campaign: any,
    rule: any,
    originalAmount: number,
    campaignAmountOverride: number | null,
    currency: string,
  ): ProductCampaignDto | null {
    const ruleType: string = rule.ruleType;
    const ruleValue = Number(rule.value);

    let discountedAmount: number;
    let discountPercentage: number;
    let discountValue: number;

    switch (ruleType) {
      case 'PERCENTAGE_DISCOUNT':
        discountPercentage = Math.min(ruleValue, 100);
        discountValue = Math.round((originalAmount * discountPercentage) / 100);
        discountedAmount = campaignAmountOverride ?? Math.max(0, originalAmount - discountValue);
        break;

      case 'FIXED_DISCOUNT':
        discountValue = ruleValue;
        discountedAmount = campaignAmountOverride ?? Math.max(0, originalAmount - discountValue);
        discountPercentage = originalAmount > 0
          ? Math.round((discountValue / originalAmount) * 100)
          : 0;
        break;

      case 'FIXED_PRICE':
        discountedAmount = campaignAmountOverride ?? ruleValue;
        discountValue = Math.max(0, originalAmount - discountedAmount);
        discountPercentage = originalAmount > 0
          ? Math.round((discountValue / originalAmount) * 100)
          : 0;
        break;

      case 'BUY_GET':
        // BUY_GET doesn't change the unit price — surface the campaign badge only
        discountedAmount = originalAmount;
        discountValue = 0;
        discountPercentage = 0;
        break;

      default:
        return null;
    }

    // Don't surface a campaign that gives no actual discount (except BUY_GET)
    if (ruleType !== 'BUY_GET' && discountedAmount >= originalAmount) return null;

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignType: campaign.type,
      originalPrice: { amount: originalAmount, currency },
      discountedPrice: { amount: discountedAmount, currency },
      discountPercentage,
      discountValue,
      ruleType: ruleType as ProductCampaignDto['ruleType'],
      endsAt: campaign.endDate ? (campaign.endDate as Date).toISOString() : null,
    };
  }

  /** Keep the campaign with the highest discount value for this product */
  private applyBestDeal(
    map: Map<string, ProductCampaignDto>,
    productId: string,
    candidate: ProductCampaignDto,
  ): void {
    const existing = map.get(productId);
    if (!existing || candidate.discountValue > existing.discountValue) {
      map.set(productId, candidate);
    }
  }

  private extractAmount(json: unknown): number | null {
    if (typeof json === 'number') return json;
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      if (typeof obj.amount === 'number') return obj.amount;
      if (typeof obj.value === 'number') return obj.value;
    }
    return null;
  }
}
