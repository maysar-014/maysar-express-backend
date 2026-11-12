/**
 * PrismaSellerLocationRepository
 *
 * Implements ISellerLocationRepository against the Prisma client.
 * Handles both Catalog_SellerLocation and Catalog_ProductLocation persistence.
 */

import { makeId } from '../../../../../shared/ids/id';
import { SellerLocation, SellerLocationProps } from '../../domain/entities/seller-location.entity';
import { ISellerLocationRepository } from '../../domain/repositories/seller-location.repository.interface';

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
        fulfillmentCapabilities: location.fulfillmentCapabilities,
        locationCode: location.locationCode ?? null,
        contactName: location.contactName ?? null,
        contactPhone: location.contactPhone ?? null,
        staffCount: location.staffCount ?? null,
        deliveryCoverageRadiusKm: location.deliveryCoverageRadiusKm ?? null,
        street: location.address.street,
        ward: location.address.ward ?? null,
        district: location.address.district ?? null,
        region: location.address.region,
        postalCode: location.address.postalCode ?? null,
        country: location.address.country,
        countryId: location.address.countryId ?? null,
        regionId: location.address.regionId ?? null,
        districtId: location.address.districtId ?? null,
        wardId: location.address.wardId ?? null,
        streetId: location.address.streetId ?? null,
        locality: location.address.locality ?? null,
        directions: location.address.directions ?? null,
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
        fulfillmentCapabilities: location.fulfillmentCapabilities,
        locationCode: location.locationCode ?? null,
        contactName: location.contactName ?? null,
        contactPhone: location.contactPhone ?? null,
        staffCount: location.staffCount ?? null,
        deliveryCoverageRadiusKm: location.deliveryCoverageRadiusKm ?? null,
        street: location.address.street,
        ward: location.address.ward ?? null,
        district: location.address.district ?? null,
        region: location.address.region,
        postalCode: location.address.postalCode ?? null,
        country: location.address.country,
        countryId: location.address.countryId ?? null,
        regionId: location.address.regionId ?? null,
        districtId: location.address.districtId ?? null,
        wardId: location.address.wardId ?? null,
        streetId: location.address.streetId ?? null,
        locality: location.address.locality ?? null,
        directions: location.address.directions ?? null,
        isPrimary: location.isPrimary,
        isActive: location.isActive,
        operatingHours: location.operatingHours ?? null,
        notes: location.notes ?? null,
        updatedAt: new Date(),
      },
    });

    await this.prisma.inventory_Warehouse.upsert({
      where: { sellerLocationId: location.id },
      create: {
        id: `invwh_${location.id}`,
        code: `SL-${location.id}`.slice(0, 50),
        name: location.name,
        type: 'store',
        status: location.isActive ? 'active' : 'inactive',
        sellerId: location.sellerId,
        sellerLocationId: location.id,
        address: { ...location.address, latitude: location.latitude, longitude: location.longitude },
      },
      update: {
        name: location.name,
        status: location.isActive ? 'active' : 'inactive',
        sellerId: location.sellerId,
        address: { ...location.address, latitude: location.latitude, longitude: location.longitude },
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

  // ── Geographic hierarchy (frontend-provided reference data) ──
  async findRegions(countryId?: string): Promise<{ id: string; code: string; name: string }[]> {
    const rows = await this.prisma.geography_Region.findMany({
      where: countryId ? { countryId } : {},
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  async findDistricts(regionId: string): Promise<{ id: string; code: string; name: string }[]> {
    const rows = await this.prisma.geography_District.findMany({
      where: { regionId },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  async findWards(districtId: string): Promise<{ id: string; code: string; name: string }[]> {
    const rows = await this.prisma.geography_Ward.findMany({
      where: { districtId },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  async findStreets(wardId: string): Promise<{ id: string; code: string; name: string }[]> {
    const rows = await this.prisma.geography_Street.findMany({
      where: { wardId },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    });
    return rows;
  }

  async findRegionCode(regionId: string): Promise<string | null> {
    const region = await this.prisma.geography_Region.findUnique({
      where: { id: regionId },
      select: { code: true },
    });
    return region?.code ?? null;
  }

  async validateGeographyIds(ids: {
    countryId?: string;
    regionId?: string;
    districtId?: string;
    wardId?: string;
    streetId?: string;
  }): Promise<boolean> {
    // Validate parent-child chain: if a child ID is provided, its parent must also be provided and valid
    if (ids.streetId) {
      const street = await this.prisma.geography_Street.findUnique({ where: { id: ids.streetId } });
      if (!street) return false;
      if (ids.wardId && ids.wardId !== street.wardId) return false;
      // Ward is implicitly validated by street's wardId
    }
    if (ids.wardId) {
      const ward = await this.prisma.geography_Ward.findUnique({ where: { id: ids.wardId } });
      if (!ward) return false;
      if (ids.districtId && ids.districtId !== ward.districtId) return false;
    }
    if (ids.districtId) {
      const district = await this.prisma.geography_District.findUnique({ where: { id: ids.districtId } });
      if (!district) return false;
      if (ids.regionId && ids.regionId !== district.regionId) return false;
    }
    if (ids.regionId) {
      const region = await this.prisma.geography_Region.findUnique({ where: { id: ids.regionId } });
      if (!region) return false;
      if (ids.countryId && ids.countryId !== region.countryId) return false;
    }
    if (ids.countryId) {
      const country = await this.prisma.geography_Country.findUnique({ where: { id: ids.countryId } });
      if (!country) return false;
    }
    return true;
  }

  async searchLocations(
    sellerId: string,
    opts: {
      query?: string;
      type?: string;
      status?: string;
      isActive?: boolean;
      regionId?: string;
      districtId?: string;
      wardId?: string;
      streetId?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ locations: SellerLocation[]; total: number }> {
    const where: any = { sellerId };
    if (opts.query) {
      where.OR = [
        { name: { contains: opts.query, mode: 'insensitive' } },
        { street: { contains: opts.query, mode: 'insensitive' } },
        { ward: { contains: opts.query, mode: 'insensitive' } },
        { district: { contains: opts.query, mode: 'insensitive' } },
        { region: { contains: opts.query, mode: 'insensitive' } },
        { locality: { contains: opts.query, mode: 'insensitive' } },
      ];
    }
    if (opts.type) where.type = opts.type;
    if (opts.status) where.status = opts.status;
    if (opts.isActive !== undefined) where.isActive = opts.isActive;
    if (opts.regionId) where.regionId = opts.regionId;
    if (opts.districtId) where.districtId = opts.districtId;
    if (opts.wardId) where.wardId = opts.wardId;
    if (opts.streetId) where.streetId = opts.streetId;

    const [rows, total] = await Promise.all([
      this.prisma.catalog_SellerLocation.findMany({
        where,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        skip: (opts.page - 1) * opts.pageSize,
        take: opts.pageSize,
      }),
      this.prisma.catalog_SellerLocation.count({ where }),
    ]);

    return { locations: rows.map((r: any) => this.toDomain(r)), total };
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
        countryId: row.countryId ?? undefined,
        regionId: row.regionId ?? undefined,
        districtId: row.districtId ?? undefined,
        wardId: row.wardId ?? undefined,
        streetId: row.streetId ?? undefined,
        locality: row.locality ?? undefined,
        directions: row.directions ?? undefined,
      },
      fulfillmentCapabilities: Array.isArray(row.fulfillmentCapabilities)
        ? row.fulfillmentCapabilities
        : row.fulfillmentCapabilities
          ? JSON.parse(row.fulfillmentCapabilities)
          : [],
      locationCode: row.locationCode ?? undefined,
      contactName: row.contactName ?? undefined,
      contactPhone: row.contactPhone ?? undefined,
      staffCount: row.staffCount ?? undefined,
      deliveryCoverageRadiusKm: row.deliveryCoverageRadiusKm != null ? Number(row.deliveryCoverageRadiusKm) : undefined,
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
}
