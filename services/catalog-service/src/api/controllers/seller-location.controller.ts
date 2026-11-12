/**
 * SellerLocationController
 *
 * All responses follow the canonical shape:
 *   { success: true, data: ... }          — success
 *   { success: false, error: { code, message, details?, timestamp, path } }  — error
 *
 * Errors are thrown as typed BaseApiError subclasses and caught by the global
 * error handler in shared/middleware/global-error-handler.middleware.ts.
 * Per-handler catch blocks map domain message patterns to the correct class.
 */

import { Request, Response, NextFunction } from 'express';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  BusinessRuleError,
  normaliseError,
} from '../../../../../shared/errors/api-errors';
import { ManageSellerLocationsUseCase } from '../../application/use-cases/manage-seller-locations.use-case';
import { generatePdfReport } from '../../../../../shared/utils/pdf-writer';

// ── Helper: extract sellerId from authenticated request ──────────────────────
function getSellerId(req: Request): string {
  const authUser = (req as any).user;
  return req.params.sellerId || authUser?.userId || authUser?.id || '';
}

// ── Helper: classify domain error message into typed API error ───────────────
function classifyError(err: unknown): never {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('not found')) throw new NotFoundError(err.message);
    if (msg.includes('forbidden')) throw new ForbiddenError(err.message);
    if (msg.includes('cannot delete') || msg.includes('active reservation') || msg.includes('max')) {
      throw new BusinessRuleError(err.message);
    }
    if (msg.includes('bounds') || msg.includes('required') || msg.includes('negative') || msg.includes('must ')) {
      throw new ValidationError(err.message);
    }
  }
  // Re-throw unknown errors — the global handler will map them to 500
  throw err;
}

// ── Helper: send success response ────────────────────────────────────────────
function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data });
}

// ── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildLocationsCsv(locations: any[]): string {
  const headers = [
    'locationId', 'sellerId', 'name', 'type', 'status', 'locationCode',
    'contactName', 'contactPhone', 'staffCount', 'deliveryCoverageRadiusKm',
    'street', 'ward', 'district', 'region', 'postalCode', 'country',
    'locality', 'directions', 'latitude', 'longitude', 'isPrimary', 'isActive',
    'fulfillmentCapabilities', 'operatingHours', 'createdAt', 'updatedAt',
  ];

  const lines: string[] = [headers.join(',')];
  for (const loc of locations) {
    const addr = loc.address || {};
    const row = [
      escapeCsv(loc.id),
      escapeCsv(loc.sellerId),
      escapeCsv(loc.name),
      escapeCsv(loc.type),
      escapeCsv(loc.status),
      escapeCsv(loc.locationCode),
      escapeCsv(loc.contactName),
      escapeCsv(loc.contactPhone),
      escapeCsv(loc.staffCount),
      escapeCsv(loc.deliveryCoverageRadiusKm),
      escapeCsv(addr.street),
      escapeCsv(addr.ward),
      escapeCsv(addr.district),
      escapeCsv(addr.region),
      escapeCsv(addr.postalCode),
      escapeCsv(addr.country),
      escapeCsv(addr.locality),
      escapeCsv(addr.directions),
      escapeCsv(loc.latitude),
      escapeCsv(loc.longitude),
      escapeCsv(loc.isPrimary),
      escapeCsv(loc.isActive),
      escapeCsv(Array.isArray(loc.fulfillmentCapabilities) ? loc.fulfillmentCapabilities.join(';') : ''),
      escapeCsv(loc.operatingHours ? JSON.stringify(loc.operatingHours) : ''),
      escapeCsv(loc.createdAt),
      escapeCsv(loc.updatedAt),
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export class SellerLocationController {
  constructor(private readonly locationUseCase: ManageSellerLocationsUseCase) {}

  // ── Locations ────────────────────────────────────────────────────────────
  async createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      if (!sellerId) throw new ValidationError('Seller identity could not be resolved from token');

      const location = await this.locationUseCase.createLocation({
        sellerId,
        name: req.body.name,
        type: req.body.type ?? 'SHOP',
        street: req.body.street,
        ward: req.body.ward,
        district: req.body.district,
        region: req.body.region,
        postalCode: req.body.postalCode,
        country: req.body.country ?? 'Tanzania',
        countryId: req.body.countryId,
        regionId: req.body.regionId,
        districtId: req.body.districtId,
        wardId: req.body.wardId,
        streetId: req.body.streetId,
        locality: req.body.locality,
        directions: req.body.directions,
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        fulfillmentCapabilities: req.body.fulfillmentCapabilities,
        isPrimary: req.body.isPrimary,
        operatingHours: req.body.operatingHours,
        notes: req.body.notes,
        contactName: req.body.contactName,
        contactPhone: req.body.contactPhone,
        staffCount: req.body.staffCount,
        deliveryCoverageRadiusKm: req.body.deliveryCoverageRadiusKm,
      });
      ok(res, this.toDto(location), 201);
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async listLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      if (!sellerId) throw new ValidationError('Seller identity could not be resolved from token');
      const locations = await this.locationUseCase.listLocations(sellerId);
      ok(res, locations.map(l => this.toDto(l)));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.getLocation(req.params.locationId, sellerId);
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.updateLocation(
        req.params.locationId,
        sellerId,
        {
          name: req.body.name,
          type: req.body.type,
          street: req.body.street,
          ward: req.body.ward,
          district: req.body.district,
          region: req.body.region,
          postalCode: req.body.postalCode,
          countryId: req.body.countryId,
          regionId: req.body.regionId,
          districtId: req.body.districtId,
          wardId: req.body.wardId,
          streetId: req.body.streetId,
          locality: req.body.locality,
          directions: req.body.directions,
          latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : undefined,
          longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : undefined,
          fulfillmentCapabilities: req.body.fulfillmentCapabilities,
          isPrimary: req.body.isPrimary,
          operatingHours: req.body.operatingHours,
          notes: req.body.notes,
          isActive: req.body.isActive,
          contactName: req.body.contactName,
          contactPhone: req.body.contactPhone,
          staffCount: req.body.staffCount,
          deliveryCoverageRadiusKm: req.body.deliveryCoverageRadiusKm,
        },
      );
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async deactivateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.updateLocation(
        req.params.locationId,
        sellerId,
        { isActive: false },
      );
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async activateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.updateLocation(
        req.params.locationId,
        sellerId,
        { isActive: true },
      );
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      await this.locationUseCase.deleteLocation(req.params.locationId, sellerId);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async deleteLocationAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.locationUseCase.adminDeleteLocation(req.params.locationId);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  // ── Location summary metrics ──────────────────────────────────────────────
  async getLocationMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const metrics = await this.locationUseCase.getLocationMetrics(req.params.locationId, sellerId);
      ok(res, metrics);
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  // ── Location detail panel ─────────────────────────────────────────────────
  async getLocationDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const detail = await this.locationUseCase.getLocationDetail(req.params.locationId, sellerId);
      ok(res, detail);
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  // ── Location report (PDF) ─────────────────────────────────────────────────
  async getLocationReportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const detail = await this.locationUseCase.getLocationDetail(req.params.locationId, sellerId);

      const pdfBuffer = generatePdfReport(detail);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="location-${req.params.locationId}-report.pdf"`,
      );
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.end(pdfBuffer);
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  // ── Location search ───────────────────────────────────────────────────────
  async searchLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const result = await this.locationUseCase.searchLocations(
        sellerId,
        req.query.q as string | undefined,
        req.query.type as any,
        req.query.status as string | undefined,
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        req.query.regionId as string | undefined,
        req.query.districtId as string | undefined,
        req.query.wardId as string | undefined,
        req.query.streetId as string | undefined,
        req.query.page ? Number(req.query.page) : 1,
        req.query.pageSize ? Number(req.query.pageSize) : 20,
      );

      // CSV export
      if (req.query.export === 'csv') {
        const csv = buildLocationsCsv(result.locations);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="seller-locations.csv"',
        );
        res.end(csv);
        return;
      }

      ok(res, result);
    } catch (err) {
      next(err);
    }
  }

  // ── DTO mappers ──────────────────────────────────────────────────────────
  private toDto(location: any) {
    return {
      id: location.id,
      sellerId: location.sellerId,
      name: location.name,
      type: location.type,
      status: location.status,
      address: {
        ...location.address,
        countryId: location.address?.countryId,
        regionId: location.address?.regionId,
        districtId: location.address?.districtId,
        wardId: location.address?.wardId,
        streetId: location.address?.streetId,
        locality: location.address?.locality,
        directions: location.address?.directions,
      },
      fulfillmentCapabilities: location.fulfillmentCapabilities ?? [],
      locationCode: location.locationCode ?? null,
      contactName: location.contactName ?? null,
      contactPhone: location.contactPhone ?? null,
      staffCount: location.staffCount ?? null,
      deliveryCoverageRadiusKm: location.deliveryCoverageRadiusKm ?? null,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      isPrimary: location.isPrimary,
      isActive: location.isActive,
      operatingHours: location.operatingHours ?? null,
      notes: location.notes ?? null,
      displayAddress: location.displayAddress,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
