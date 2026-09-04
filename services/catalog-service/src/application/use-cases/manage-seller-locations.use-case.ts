/**
 * ManageSellerLocationsUseCase
 *
 * Handles CRUD for seller-owned shop/warehouse locations.
 * Enforces:
 *   - A seller may have max 10 active locations (prevents abuse)
 *   - Exactly one isPrimary per seller at any time
 *   - Coordinates must be plausible Tanzania WGS-84 bounds
 *     (lat: -12 to 0, lng: 29 to 41)
 */

import { makeId } from '../../../../../shared/ids/id';
import { SellerLocation, LocationType } from '../../domain/entities/seller-location.entity';
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
  street: string;
  ward?: string;
  district?: string;
  region: string;
  postalCode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  isPrimary?: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
}

export interface UpdateLocationRequest {
  name?: string;
  type?: LocationType;
  street?: string;
  ward?: string;
  district?: string;
  region?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
  operatingHours?: Record<string, string>;
  notes?: string;
  isActive?: boolean;
}

export class ManageSellerLocationsUseCase {
  constructor(private readonly repo: ISellerLocationRepository) {}

  async createLocation(req: CreateLocationRequest): Promise<SellerLocation> {
    this.validateCoords(req.latitude, req.longitude);

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
      },
      latitude: req.latitude,
      longitude: req.longitude,
      isPrimary,
      isActive: true,
      operatingHours: req.operatingHours,
      notes: req.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.save(location);
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

    if (req.latitude !== undefined || req.longitude !== undefined) {
      const lat = req.latitude ?? location.latitude;
      const lng = req.longitude ?? location.longitude;
      this.validateCoords(lat, lng);
    }

    if (req.name !== undefined) location.name = req.name;
    if (req.type !== undefined) location.type = req.type;
    if (req.notes !== undefined) location.notes = req.notes;
    if (req.operatingHours !== undefined) location.operatingHours = req.operatingHours;
    if (req.isActive === false) location.deactivate();
    if (req.isActive === true) location.activate();

    if (req.street !== undefined) location.address = { ...location.address, street: req.street };
    if (req.ward !== undefined) location.address = { ...location.address, ward: req.ward };
    if (req.district !== undefined) location.address = { ...location.address, district: req.district };
    if (req.region !== undefined) location.address = { ...location.address, region: req.region };
    if (req.postalCode !== undefined) location.address = { ...location.address, postalCode: req.postalCode };

    if (req.isPrimary) {
      await this.repo.clearPrimaryForSeller(sellerId);
      location.isPrimary = true;
    }

    location.updatedAt = new Date();
    await this.repo.save(location);
    return location;
  }

  async deleteLocation(locationId: string, sellerId: string): Promise<void> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== sellerId) throw new Error('Forbidden');
    if (location.isPrimary) {
      throw new Error('Cannot delete the primary location. Set another location as primary first.');
    }
    await this.repo.delete(locationId);
  }

  /**
   * Admin-only hard delete. Bypasses seller ownership and primary-location checks.
   * All inventory records cascade-delete via DB FK constraint.
   */
  async adminDeleteLocation(locationId: string): Promise<void> {
    const location = await this.repo.findById(locationId);
    if (!location) throw new Error('Location not found');
    await this.repo.delete(locationId);
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

  private validateCoords(lat: number, lng: number): void {
    if (lat < TANZANIA_LAT_MIN || lat > TANZANIA_LAT_MAX) {
      throw new Error(`Latitude ${lat} is outside Tanzania bounds [${TANZANIA_LAT_MIN}, ${TANZANIA_LAT_MAX}]`);
    }
    if (lng < TANZANIA_LNG_MIN || lng > TANZANIA_LNG_MAX) {
      throw new Error(`Longitude ${lng} is outside Tanzania bounds [${TANZANIA_LNG_MIN}, ${TANZANIA_LNG_MAX}]`);
    }
  }
}
