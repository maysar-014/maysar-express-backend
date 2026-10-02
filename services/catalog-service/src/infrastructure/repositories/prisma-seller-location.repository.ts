/**
 * PrismaSellerLocationRepository
 *
 * Implements ISellerLocationRepository against the Prisma client.
 * Handles both Catalog_SellerLocation and Catalog_ProductLocation persistence.
 */

import { makeId } from '../../../../../shared/ids/id';
import { SellerLocation, SellerLocationProps } from '../../domain/entities/seller-location.entity';
import { ProductLocation, ProductLocationProps } from '../../domain/entities/product-location.entity';
import { ISellerLocationRepository } from '../../domain/repositories/seller-location.repository.interface';
import { haversineKm } from '../../../../../shared/geo/haversine';

export class PrismaSellerLocationRepository implements ISellerLocationRepository {
  constructor(private readonly prisma: any) {}

  // ── Locations ────────────────────────────────────────────────────────────

  async save(location: SellerLocation): Promise<void> {
    await this.prisma.catalog_SellerLocation.upsert({
      where: { id: location.id },
      create: {
        id: location.id,
        sellerId: location.sellerId,
        name: location.name,
        type: location.type,
        status: location.status,
        street: location.address.street,
        ward: location.address.ward ?? null,
        district: location.address.district ?? null,
        region: location.address.region,
        postalCode: location.address.postalCode ?? null,
        country: location.address.country,
        latitude: location.latitude,
        longitude: location.longitude,
        isPrimary: location.isPrimary,
        isActive: location.isActive,
        operatingHours: location.operatingHours ?? null,
        notes: location.notes ?? null,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      },
      update: {
        name: location.name,
        type: location.type,
        status: location.status,
        street: location.address.street,
        ward: location.address.ward ?? null,
        district: location.address.district ?? null,
        region: location.address.region,
        postalCode: location.address.postalCode ?? null,
        country: location.address.country,
        isPrimary: location.isPrimary,
        isActive: location.isActive,
        operatingHours: location.operatingHours ?? null,
        notes: location.notes ?? null,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<SellerLocation | null> {
    const row = await this.prisma.catalog_SellerLocation.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySeller(sellerId: string): Promise<SellerLocation[]> {
    const rows = await this.prisma.catalog_SellerLocation.findMany({
      where: { sellerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((r: any) => this.toDomain(r));
  }

  async findPrimaryForSeller(sellerId: string): Promise<SellerLocation | null> {
    const row = await this.prisma.catalog_SellerLocation.findFirst({
      where: { sellerId, isPrimary: true, isActive: true },
    });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Seller-scoped lookup used by CreateProductUseCase for a supplier location id
   * that does not carry the `sloc_` prefix (the legacy BusinessAddress path).
   *
   * This method was declared by the use case but never existed on this class, so
   * the call threw `findByIdForSeller is not a function`, was swallowed by the
   * surrounding try/catch, and surfaced as the generic
   * "Seller location lookup failed" — a dead validation branch.
   *
   * The `sellerId` predicate is load-bearing: it is the ownership check that
   * stops a seller from attaching another seller's saved location to a product.
   * Resolving by `id` alone would be an IDOR, so this deliberately is not
   * implemented in terms of `findById`. Inactive locations are excluded to match
   * the `sloc_` branch. Returns null when the location is missing, owned by
   * another seller, or inactive — callers must treat null as "not found for
   * this seller" rather than retrying without the seller filter.
   *
   * The returned shape and displayName composition intentionally mirror the
   * `sloc_` branch of CreateProductUseCase so both paths produce identical
   * product location strings.
   */
  async findByIdForSeller(
    locationId: string,
    sellerId: string,
  ): Promise<{
    id: string;
    sellerId: string;
    businessId: string;
    city: string;
    region: string;
    country: string;
    displayName: string;
    isPrimary: boolean;
  } | null> {
    const row = await this.prisma.catalog_SellerLocation.findFirst({
      where: { id: locationId, sellerId, isActive: true },
      select: {
        id: true, sellerId: true, name: true, street: true,
        ward: true, district: true, region: true, country: true, isPrimary: true,
      },
    });
    if (!row) return null;

    return {
      id: row.id,
      sellerId: row.sellerId,
      businessId: row.sellerId,
      city: row.district ?? row.region ?? '',
      region: row.region ?? '',
      country: row.country ?? 'Tanzania',
      displayName: [row.street, row.ward, row.district, row.region].filter(Boolean).join(', '),
      isPrimary: row.isPrimary,
    };
  }

  async clearPrimaryForSeller(sellerId: string): Promise<void> {
    await this.prisma.catalog_SellerLocation.updateMany({
      where: { sellerId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.catalog_SellerLocation.delete({ where: { id } });
  }

  // ── Product inventory ────────────────────────────────────────────────────

  async saveProductLocation(pl: ProductLocation): Promise<void> {
    await this.prisma.catalog_ProductLocation.upsert({
      where: { productId_locationId: { productId: pl.productId, locationId: pl.locationId } },
      create: {
        id: pl.id,
        productId: pl.productId,
        locationId: pl.locationId,
        sellerId: pl.sellerId,
        quantityAvailable: pl.quantityAvailable,
        quantityReserved: pl.quantityReserved,
        isAvailable: pl.isAvailable,
        createdAt: pl.createdAt,
        updatedAt: pl.updatedAt,
      },
      update: {
        quantityAvailable: pl.quantityAvailable,
        quantityReserved: pl.quantityReserved,
        isAvailable: pl.isAvailable,
        updatedAt: new Date(),
      },
    });
  }

  async findProductLocation(productId: string, locationId: string): Promise<ProductLocation | null> {
    const row = await this.prisma.catalog_ProductLocation.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });
    return row ? this.toProductLocationDomain(row) : null;
  }

  async findProductLocations(productId: string): Promise<ProductLocation[]> {
    const rows = await this.prisma.catalog_ProductLocation.findMany({
      where: { productId },
      include: { location: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: any) => this.toProductLocationDomain(r));
  }

  async findLocationProducts(locationId: string): Promise<ProductLocation[]> {
    const rows = await this.prisma.catalog_ProductLocation.findMany({
      where: { locationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r: any) => this.toProductLocationDomain(r));
  }

  async deleteProductLocation(productId: string, locationId: string): Promise<void> {
    await this.prisma.catalog_ProductLocation.delete({
      where: { productId_locationId: { productId, locationId } },
    });
  }

  async findAvailableLocationsForProduct(
    productId: string,
    buyerLat: number,
    buyerLng: number,
  ): Promise<Array<ProductLocation & { distanceKm: number; location: SellerLocation }>> {
    const rows = await this.prisma.catalog_ProductLocation.findMany({
      where: {
        productId,
        isAvailable: true,
        quantityAvailable: { gt: 0 },
        location: { isActive: true, status: 'ACTIVE' },
      },
      include: { location: true },
    });

    return rows
      .map((r: any) => {
        const pl = this.toProductLocationDomain(r);
        const loc = this.toDomain(r.location);
        const distanceKm = haversineKm(buyerLat, buyerLng, loc.latitude, loc.longitude);
        // Explicitly capture getter before spreading — plain object spread loses class getters
        const netAvailable = pl.netAvailable;
        return { ...pl, netAvailable, distanceKm, location: loc };
      })
      .filter((r: any) => r.netAvailable > 0)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm);
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  private toDomain(row: any): SellerLocation {
    return new SellerLocation({
      id: row.id,
      sellerId: row.sellerId,
      name: row.name,
      type: row.type,
      status: row.status,
      address: {
        street: row.street,
        ward: row.ward ?? undefined,
        district: row.district ?? undefined,
        region: row.region,
        postalCode: row.postalCode ?? undefined,
        country: row.country,
      },
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      isPrimary: row.isPrimary,
      isActive: row.isActive,
      operatingHours: row.operatingHours ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toProductLocationDomain(row: any): ProductLocation {
    return new ProductLocation({
      id: row.id,
      productId: row.productId,
      locationId: row.locationId,
      sellerId: row.sellerId,
      quantityAvailable: row.quantityAvailable,
      quantityReserved: row.quantityReserved,
      isAvailable: row.isAvailable,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
