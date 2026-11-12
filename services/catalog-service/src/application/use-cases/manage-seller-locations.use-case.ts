/**
 * ManageSellerLocationsUseCase
 *
 * Handles CRUD for seller-owned shop/warehouse locations.
 * Enforces:
 *   - A seller may have max 10 active locations (prevents abuse)
 *   - Exactly one isPrimary per seller at any time
 *   - Coordinates must be plausible Tanzania WGS-84 bounds
 *     (lat: -12 to 0, lng: 29 to 41)
 *
 * Architecture note: Catalog owns ONLY business/location metadata. Physical
 * stock, transfers, stock-outs, and reconciliation live in inventory-service.
 * When a seller location is saved, this use case provisions (or syncs) a
 * corresponding owned Inventory warehouse via the warehouse bridge.
 */

import { makeId } from '../../../../../shared/ids/id';
import { SellerLocation, LocationType, FulfillmentCapability } from '../../domain/entities/seller-location.entity';
import { ISellerLocationRepository } from '../../domain/repositories/seller-location.repository.interface';

const TANZANIA_LAT_MIN = -12;
const TANZANIA_LAT_MAX = 0.5;
const TANZANIA_LNG_MIN = 28;
const TANZANIA_LNG_MAX = 41;
const MAX_LOCATIONS_PER_SELLER = 10;

export interface CreateLocationRequest {
  sellerId: string;
  name: string;
  type: LocationType;
  street?: string;
  ward?: string;
  district?: string;
  region: string;
  postalCode?: string;
  country?: string;
  // Stable references to frontend-provided geographic entities
  countryId?: string;
  regionId?: string;
  districtId?: string;
  wardId?: string;
  streetId?: string;
  // Manual locality / practical directions fallback when official street data is unavailable
  locality?: string;
  directions?: string;
  latitude: number;
  longitude: number;
  fulfillmentCapabilities?: FulfillmentCapability[];
  isPrimary?: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  contactName?: string;
  contactPhone?: string;
  staffCount?: number;
  deliveryCoverageRadiusKm?: number;
}

export interface UpdateLocationRequest {
  name?: string;
  type?: LocationType;
  street?: string;
  ward?: string;
  district?: string;
  region?: string;
  postalCode?: string;
  countryId?: string;
  regionId?: string;
  districtId?: string;
  wardId?: string;
  streetId?: string;
  locality?: string;
  directions?: string;
  latitude?: number;
  longitude?: number;
  fulfillmentCapabilities?: FulfillmentCapability[];
  isPrimary?: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  isActive?: boolean;
  contactName?: string;
  contactPhone?: string;
  staffCount?: number;
  deliveryCoverageRadiusKm?: number;
}

export interface LocationSummaryMetrics {
  locationId: string;
  warehouseId: string | null;
  staffCount: number | null;
  isActive: boolean;
  isPrimary: boolean;
  fulfillmentCapabilities: FulfillmentCapability[];
  deliveryCoverageRadiusKm: number | null;
  lastActivityAt: Date | null;
}

export interface LocationDetailPanel {
  location: SellerLocation;
  fulfillmentSettings: {
    capabilities: FulfillmentCapability[];
    operatingHours: Record<string, string> | null;
    isPrimary: boolean;
    isActive: boolean;
    contactName: string | null;
    contactPhone: string | null;
    deliveryCoverageRadiusKm: number | null;
  };
  inventory: {
    warehouseId: string | null;
    note: string;
  };
}


export class ManageSellerLocationsUseCase {
  constructor(private readonly repo: ISellerLocationRepository) {}

  async createLocation(req: CreateLocationRequest): Promise<SellerLocation> {
    this.validateCoords(req.latitude, req.longitude);

    // Validate geographic ID chain if any IDs provided
    if (req.countryId || req.regionId || req.districtId || req.wardId || req.streetId) {
      const valid = await this.repo.validateGeographyIds({
        countryId: req.countryId,
        regionId: req.regionId,
        districtId: req.districtId,
        wardId: req.wardId,
        streetId: req.streetId,
      });
      if (!valid) {
        throw new Error('Invalid geographic ID hierarchy');
      }
    }

    const existing = await this.repo.findBySeller(req.sellerId);
    if (existing.filter(l => l.isActive).length >= MAX_LOCATIONS_PER_SELLER) {
      throw new Error(`Seller may have at most ${MAX_LOCATIONS_PER_SELLER} active locations`);
    }

    // If this is set as primary, clear existing primary first
    if (req.isPrimary) {
      await this.repo.clearPrimaryForSeller(req.sellerId);
    }

    // If no locations exist yet, auto-set as primary
    const isPrimary = req.isPrimary ?? existing.length === 0;

    // Generate human-readable location code: LOC-{REGION_CODE}-{SEQUENCE}
    const regionCode = req.regionId ? await this.repo.findRegionCode?.(req.regionId) : undefined;
    const codePrefix = regionCode ?? req.region?.substring(0, 3).toUpperCase() ?? 'LOC';
    const sequence = existing.length + 1;
    const locationCode = `LOC-${codePrefix}-${String(sequence).padStart(3, '0')}`;

    const location = new SellerLocation({
      id: makeId('sloc'),
      sellerId: req.sellerId,
      name: req.name,
      type: req.type,
      status: 'ACTIVE',
      address: {
        street: req.street,
        ward: req.ward,
        district: req.district,
        region: req.region,
        postalCode: req.postalCode,
        country: req.country ?? 'Tanzania',
        countryId: req.countryId,
        regionId: req.regionId,
        districtId: req.districtId,
        wardId: req.wardId,
        streetId: req.streetId,
        locality: req.locality,
        directions: req.directions,
      },
      fulfillmentCapabilities: req.fulfillmentCapabilities ?? [],
      latitude: req.latitude,
      longitude: req.longitude,
      isPrimary,
      isActive: true,
      operatingHours: req.operatingHours,
      notes: req.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      locationCode,
      contactName: req.contactName,
      contactPhone: req.contactPhone,
      staffCount: req.staffCount,
      deliveryCoverageRadiusKm: req.deliveryCoverageRadiusKm,
    });

    await this.repo.save(location);
    await this.provisionInventoryWarehouse(location);
    return location;
  }

  async updateLocation(
    locationId: string,
    sellerId: string,
    req: UpdateLocationRequest,
  ): Promise<SellerLocation> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== sellerId) throw new Error('Forbidden');

    // Dependency check: cannot deactivate a location that still holds stock
    if (req.isActive === false) {
      await this.validateLocationCanBeDeactivated(locationId);
    }

    if (req.latitude !== undefined || req.longitude !== undefined) {
      const lat = req.latitude ?? location.latitude;
      const lng = req.longitude ?? location.longitude;
      this.validateCoords(lat, lng);
    }

    // Validate geographic ID chain if any IDs provided
    if (req.countryId !== undefined || req.regionId !== undefined || req.districtId !== undefined ||
        req.wardId !== undefined || req.streetId !== undefined) {
      const valid = await this.repo.validateGeographyIds({
        countryId: req.countryId ?? location.address.countryId,
        regionId: req.regionId ?? location.address.regionId,
        districtId: req.districtId ?? location.address.districtId,
        wardId: req.wardId ?? location.address.wardId,
        streetId: req.streetId ?? location.address.streetId,
      });
      if (!valid) {
        throw new Error('Invalid geographic ID hierarchy');
      }
    }

    if (req.name !== undefined) location.name = req.name;
    if (req.type !== undefined) location.type = req.type;
    if (req.notes !== undefined) location.notes = req.notes;
    if (req.operatingHours !== undefined) location.operatingHours = req.operatingHours;
    if (req.fulfillmentCapabilities !== undefined) location.fulfillmentCapabilities = req.fulfillmentCapabilities;
    if (req.isActive === false) location.deactivate();
    if (req.isActive === true) location.activate();

    if (req.street !== undefined) location.address = { ...location.address, street: req.street };
    if (req.ward !== undefined) location.address = { ...location.address, ward: req.ward };
    if (req.district !== undefined) location.address = { ...location.address, district: req.district };
    if (req.region !== undefined) location.address = { ...location.address, region: req.region };
    if (req.postalCode !== undefined) location.address = { ...location.address, postalCode: req.postalCode };
    if (req.countryId !== undefined) location.address = { ...location.address, countryId: req.countryId };
    if (req.regionId !== undefined) location.address = { ...location.address, regionId: req.regionId };
    if (req.districtId !== undefined) location.address = { ...location.address, districtId: req.districtId };
    if (req.wardId !== undefined) location.address = { ...location.address, wardId: req.wardId };
    if (req.streetId !== undefined) location.address = { ...location.address, streetId: req.streetId };
    if (req.locality !== undefined) location.address = { ...location.address, locality: req.locality };
    if (req.directions !== undefined) location.address = { ...location.address, directions: req.directions };

    if (req.contactName !== undefined) location.contactName = req.contactName;
    if (req.contactPhone !== undefined) location.contactPhone = req.contactPhone;
    if (req.staffCount !== undefined) location.staffCount = req.staffCount;
    if (req.deliveryCoverageRadiusKm !== undefined) location.deliveryCoverageRadiusKm = req.deliveryCoverageRadiusKm;

    if (req.isPrimary) {
      await this.repo.clearPrimaryForSeller(sellerId);
      location.isPrimary = true;
    }

    location.updatedAt = new Date();
    await this.repo.save(location);
    await this.provisionInventoryWarehouse(location);
    return location;
  }


  async deleteLocation(locationId: string, sellerId: string): Promise<void> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== sellerId) throw new Error('Forbidden');
    if (location.isPrimary) {
      throw new Error('Cannot delete the primary location. Set another location as primary first.');
    }
    await this.validateLocationCanBeDeactivated(locationId);
    await this.repo.delete(locationId);
  }

  /**
   * Admin-only hard delete. Bypasses seller ownership and primary-location checks.
   * Physical stock lives in Inventory and is not deleted by this operation.
   */
  async adminDeleteLocation(locationId: string): Promise<void> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    await this.validateLocationCanBeDeactivated(locationId);
    await this.repo.delete(locationId);
  }

  /**
   * Checks whether a location can be deactivated or deleted.
   * Physical stock lives in Inventory; consult the owned warehouse's stock items.
   * Pending transfers / stock-outs are inventory-service concerns and must be
   * resolved there before deactivation.
   */
  private async validateLocationCanBeDeactivated(locationId: string): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.inventory_Warehouse) return;

    const warehouse = await prisma.inventory_Warehouse.findUnique({
      where: { sellerLocationId: locationId },
      select: { id: true },
    });
    if (!warehouse) return;

    const stockItems = await prisma.inventory_StockItem.findMany({
      where: { warehouseId: warehouse.id },
      select: { quantityAvailable: true, quantityReserved: true, quantityUnavailable: true, quantityInTransit: true },
    });
    const hasStock = stockItems.some((si: any) =>
      si.quantityAvailable > 0 || si.quantityReserved > 0 ||
      si.quantityUnavailable > 0 || si.quantityInTransit > 0,
    );
    if (hasStock) {
      throw new Error('Cannot deactivate location with existing stock. Transfer or deplete stock first.');
    }
  }

  async listLocations(sellerId: string): Promise<SellerLocation[]> {
    return this.repo.findBySeller(sellerId);
  }

  async getLocation(locationId: string, sellerId: string): Promise<SellerLocation> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== sellerId) throw new Error('Forbidden');
    return location;
  }


  async getLocationMetrics(locationId: string, sellerId: string): Promise<LocationSummaryMetrics> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== sellerId) throw new Error('Forbidden');

    const warehouseId = await this.findLinkedWarehouseId(locationId);

    return {
      locationId,
      warehouseId,
      staffCount: location.staffCount ?? null,
      isActive: location.isActive,
      isPrimary: location.isPrimary,
      fulfillmentCapabilities: location.fulfillmentCapabilities,
      deliveryCoverageRadiusKm: location.deliveryCoverageRadiusKm ?? null,
      lastActivityAt: location.updatedAt,
    };
  }

  async getLocationDetail(locationId: string, sellerId: string): Promise<LocationDetailPanel> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== sellerId) throw new Error('Forbidden');

    const warehouseId = await this.findLinkedWarehouseId(locationId);

    return {
      location,
      fulfillmentSettings: {
        capabilities: location.fulfillmentCapabilities,
        operatingHours: location.operatingHours ?? null,
        isPrimary: location.isPrimary,
        isActive: location.isActive,
        contactName: location.contactName ?? null,
        contactPhone: location.contactPhone ?? null,
        deliveryCoverageRadiusKm: location.deliveryCoverageRadiusKm ?? null,
      },
      inventory: {
        warehouseId,
        note: 'Physical stock lives in inventory-service. Query /api/inventory/stock-outs and /api/inventory/warehouses for stock data.',
      },
    };
  }

  async searchLocations(
    sellerId: string,
    query?: string,
    type?: LocationType,
    status?: string,
    isActive?: boolean,
    regionId?: string,
    districtId?: string,
    wardId?: string,
    streetId?: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ locations: SellerLocation[]; total: number; page: number; pageSize: number }> {
    const result = await this.repo.searchLocations?.(sellerId, {
      query,
      type,
      status,
      isActive,
      regionId,
      districtId,
      wardId,
      streetId,
      page,
      pageSize,
    });

    return {
      locations: result?.locations ?? [],
      total: result?.total ?? 0,
      page,
      pageSize,
    };
  }

  // ── Inventory warehouse bridge ─────────────────────────────────────────────

  /**
   * Provisions (or syncs) the owned Inventory warehouse that corresponds to a
   * Catalog seller location. The warehouse carries sellerId + sellerLocationId
   * as ownership metadata; physical stock lives in Inventory, not Catalog.
   */
  private async provisionInventoryWarehouse(location: SellerLocation): Promise<void> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.inventory_Warehouse) return;

    const address = {
      street: location.address.street,
      locality: location.address.locality,
      directions: location.address.directions,
      ward: location.address.ward,
      district: location.address.district,
      region: location.address.region,
      postalCode: location.address.postalCode,
      country: location.address.country,
      countryId: location.address.countryId,
      regionId: location.address.regionId,
      districtId: location.address.districtId,
      wardId: location.address.wardId,
      streetId: location.address.streetId,
      latitude: location.latitude,
      longitude: location.longitude,
    };

    const warehouseType = location.type === 'WAREHOUSE' || location.type === 'DISTRIBUTION_CENTER'
      ? 'central'
      : 'store';
    const warehouseStatus = location.isActive ? 'active' : 'inactive';
    const code = location.locationCode ?? `WH-${location.id}`;

    const existing = await prisma.inventory_Warehouse.findUnique({
      where: { sellerLocationId: location.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.inventory_Warehouse.update({
        where: { id: existing.id },
        data: {
          name: location.name,
          address,
          status: warehouseStatus,
          operatingHours: location.operatingHours ?? null,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.inventory_Warehouse.create({
        data: {
          id: makeId('wh'),
          code,
          name: location.name,
          address,
          type: warehouseType,
          status: warehouseStatus,
          operatingHours: location.operatingHours ?? null,
          sellerId: location.sellerId,
          sellerLocationId: location.id,
        },
      });
    }
  }

  private async findLinkedWarehouseId(locationId: string): Promise<string | null> {
    const prisma = (globalThis as any).prisma;
    if (!prisma?.inventory_Warehouse) return null;
    const wh = await prisma.inventory_Warehouse.findUnique({
      where: { sellerLocationId: locationId },
      select: { id: true },
    });
    return wh?.id ?? null;
  }

  private validateCoords(lat: number, lng: number): void {
    if (lat < TANZANIA_LAT_MIN || lat > TANZANIA_LAT_MAX) {
      throw new Error(`Latitude ${lat} is outside Tanzania bounds [${TANZANIA_LAT_MIN}, ${TANZANIA_LAT_MAX}]`);
    }
    if (lng < TANZANIA_LNG_MIN || lng > TANZANIA_LNG_MAX) {
      throw new Error(`Longitude ${lng} is outside Tanzania bounds [${TANZANIA_LNG_MIN}, ${TANZANIA_LNG_MAX}]`);
    }
  }
}
