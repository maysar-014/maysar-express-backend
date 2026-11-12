/**
 * GeographyController
 *
 * Provides hierarchical geographic reference data (Country → Region → District → Ward → Street).
 * All reference data is provided by the frontend; this layer stores and serves it authoritatively.
 *
 * All responses follow the canonical shape:
 *   { success: true, data: ... }
 *   { success: false, error: { code, message, details?, timestamp, path } }
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../../../../../shared/errors/api-errors';
import { ISellerLocationRepository } from '../../domain/repositories/seller-location.repository.interface';

function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data });
}

export class GeographyController {
  constructor(private readonly repo: ISellerLocationRepository) {}

  /** GET /api/catalog/geography/regions?countryId=... */
  async listRegions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { countryId } = req.query;
      const regions = await this.repo.findRegions(countryId as string | undefined);
      ok(res, regions);
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/catalog/geography/districts?regionId=... */
  async listDistricts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { regionId } = req.query;
      if (!regionId) throw new ValidationError('regionId is required');
      const districts = await this.repo.findDistricts(regionId as string);
      ok(res, districts);
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/catalog/geography/wards?districtId=... */
  async listWards(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { districtId } = req.query;
      if (!districtId) throw new ValidationError('districtId is required');
      const wards = await this.repo.findWards(districtId as string);
      ok(res, wards);
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/catalog/geography/streets?wardId=... */
  async listStreets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { wardId } = req.query;
      if (!wardId) throw new ValidationError('wardId is required');
      const streets = await this.repo.findStreets(wardId as string);
      ok(res, streets);
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/catalog/geography/validate */
  async validateGeography(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { countryId, regionId, districtId, wardId, streetId } = req.query;
      const valid = await this.repo.validateGeographyIds({
        countryId: countryId as string | undefined,
        regionId: regionId as string | undefined,
        districtId: districtId as string | undefined,
        wardId: wardId as string | undefined,
        streetId: streetId as string | undefined,
      });
      ok(res, { valid });
    } catch (err) {
      next(err);
    }
  }
}