/**
 * Prisma implementations for Vehicle + VehicleTariff repositories (Phase 2 §2.3).
 */

import { Vehicle, VehicleData, VehicleType } from '../../domain/entities/vehicle.entity';
import { VehicleRepository } from '../../domain/repositories/vehicle.repository';
import { VehicleTariff, VehicleTariffData } from '../../domain/entities/vehicle-tariff.entity';
import { VehicleTariffRepository } from '../../domain/repositories/vehicle-tariff.repository';

// ─── Vehicle ──────────────────────────────────────────────────────────────────

export class PrismaVehicleRepository implements VehicleRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async save(vehicle: Vehicle): Promise<void> {
    const data = vehicle.toData();
    await this.prisma?.logistics_Vehicle?.upsert?.({
      where: { id: data.id },
      create: {
        id: data.id,
        driverId: data.driverId,
        vehicleType: data.vehicleType,
        maxWeightKg: data.maxWeightKg,
        maxVolumeM3: data.maxVolumeM3 ?? undefined,
        cargoDimensions: data.cargoDimensions ?? undefined,
        servesAreas: data.servesAreas,
        operatingHours: data.operatingHours,
        hasRefrigeration: data.hasRefrigeration,
        handlesFragile: data.handlesFragile,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        vehicleType: data.vehicleType,
        maxWeightKg: data.maxWeightKg,
        maxVolumeM3: data.maxVolumeM3,
        cargoDimensions: data.cargoDimensions ?? null,
        servesAreas: data.servesAreas,
        operatingHours: data.operatingHours,
        hasRefrigeration: data.hasRefrigeration,
        handlesFragile: data.handlesFragile,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    });
  }

  async findById(id: string): Promise<Vehicle | null> {
    const row = await this.prisma?.logistics_Vehicle?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findByDriverId(driverId: string): Promise<Vehicle[]> {
    const rows = await this.prisma?.logistics_Vehicle?.findMany?.({ where: { driverId } });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  async findActiveByTypeAndArea(vehicleType: string, area: string): Promise<Vehicle[]> {
    const rows = await this.prisma?.logistics_Vehicle?.findMany?.({
      where: { vehicleType, isActive: true },
    });
    return (rows ?? [])
      .filter((r: any) => Array.isArray(r.servesAreas) && r.servesAreas.includes(area))
      .map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): Vehicle {
    const data: VehicleData = {
      id: row.id,
      driverId: row.driverId,
      vehicleType: row.vehicleType as VehicleType,
      maxWeightKg: Number(row.maxWeightKg),
      maxVolumeM3: row.maxVolumeM3 !== null && row.maxVolumeM3 !== undefined ? Number(row.maxVolumeM3) : null,
      cargoDimensions: row.cargoDimensions ?? null,
      servesAreas: (row.servesAreas ?? []) as string[],
      operatingHours: (row.operatingHours ?? []) as VehicleData['operatingHours'],
      hasRefrigeration: row.hasRefrigeration ?? false,
      handlesFragile: row.handlesFragile ?? false,
      isActive: row.isActive ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return new Vehicle(data);
  }
}

// ─── VehicleTariff ────────────────────────────────────────────────────────────

export class PrismaVehicleTariffRepository implements VehicleTariffRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  /**
   * Always creates a new row with the next monotonic version for the vehicle.
   * Never overwrites or updates an existing tariff.
   */
  async save(tariff: VehicleTariff): Promise<void> {
    const data = tariff.toData();
    // Compute next version: max(existing version for vehicle) + 1
    const existing = await this.prisma?.logistics_VehicleTariff?.findMany?.({
      where: { vehicleId: data.vehicleId },
      select: { version: true },
    });
    const maxVersion = (existing ?? []).reduce((max: number, r: any) => Math.max(max, Number(r.version)), 0);
    const versionToSave = data.version > maxVersion ? data.version : maxVersion + 1;

    await this.prisma?.logistics_VehicleTariff?.create?.({
      data: {
        id: data.id,
        vehicleId: data.vehicleId,
        version: versionToSave,
        baseOperatingCostTzs: data.baseOperatingCostTzs,
        costPerKmTzs: data.costPerKmTzs,
        costPerHourTzs: data.costPerHourTzs,
        minimumJobCompensationTzs: data.minimumJobCompensationTzs,
        loadingFeeTzs: data.loadingFeeTzs,
        unloadingFeeTzs: data.unloadingFeeTzs,
        waitingRateTzsPerMinute: data.waitingRateTzsPerMinute,
        freeWaitMinutes: data.freeWaitMinutes,
        isActive: data.isActive,
        effectiveFrom: data.effectiveFrom,
        createdAt: data.createdAt,
      },
    });
  }

  async findById(id: string): Promise<VehicleTariff | null> {
    const row = await this.prisma?.logistics_VehicleTariff?.findUnique?.({ where: { id } });
    return row ? this.rowToEntity(row) : null;
  }

  async findVersion(vehicleId: string, version: number): Promise<VehicleTariff | null> {
    const row = await this.prisma?.logistics_VehicleTariff?.findUnique?.({
      where: { vehicleId_version: { vehicleId, version } },
    });
    return row ? this.rowToEntity(row) : null;
  }

  async findLatestActive(vehicleId?: string): Promise<VehicleTariff | null> {
    const where: any = { isActive: true };
    if (vehicleId) where.vehicleId = vehicleId;
    const row = await this.prisma?.logistics_VehicleTariff?.findFirst?.({
      where,
      orderBy: [{ version: 'desc' }, { effectiveFrom: 'desc' }],
    });
    return row ? this.rowToEntity(row) : null;
  }

  async findVersionsForVehicle(vehicleId: string): Promise<VehicleTariff[]> {
    const rows = await this.prisma?.logistics_VehicleTariff?.findMany?.({
      where: { vehicleId },
      orderBy: { version: 'asc' },
    });
    return (rows ?? []).map((r: any) => this.rowToEntity(r));
  }

  private rowToEntity(row: any): VehicleTariff {
    const data: VehicleTariffData = {
      id: row.id,
      vehicleId: row.vehicleId,
      version: Number(row.version),
      baseOperatingCostTzs: Number(row.baseOperatingCostTzs),
      costPerKmTzs: Number(row.costPerKmTzs),
      costPerHourTzs: Number(row.costPerHourTzs),
      minimumJobCompensationTzs: Number(row.minimumJobCompensationTzs),
      loadingFeeTzs: Number(row.loadingFeeTzs),
      unloadingFeeTzs: Number(row.unloadingFeeTzs),
      waitingRateTzsPerMinute: Number(row.waitingRateTzsPerMinute),
      freeWaitMinutes: row.freeWaitMinutes,
      isActive: row.isActive,
      effectiveFrom: row.effectiveFrom,
      createdAt: row.createdAt,
    };
    return new VehicleTariff(data);
  }
}