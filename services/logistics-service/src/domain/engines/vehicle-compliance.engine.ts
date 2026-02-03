export interface VehicleCompliance {
  registrationStatus: 'valid' | 'expired' | 'pending' | 'invalid';
  insuranceStatus: 'active' | 'expired' | 'pending' | 'none';
  maintenanceStatus: 'current' | 'due' | 'overdue' | 'unknown';
  inspectionStatus: 'passed' | 'failed' | 'due' | 'overdue';
  eligibilityScore: number;
  overallStatus: 'compliant' | 'warning' | 'non_compliant';
}

export interface MaintenanceSchedule {
  vehicleId: string;
  nextService: Date;
  lastService: Date;
  serviceType: 'routine' | 'inspection' | 'repair';
  mileage: number;
  alerts: MaintenanceAlert[];
}

export interface MaintenanceAlert {
  type: 'service_due' | 'inspection_due' | 'document_expiry' | 'safety_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  dueDate?: Date;
  actionRequired: string;
}

export interface VehicleDocument {
  type: 'registration' | 'insurance' | 'inspection' | 'license';
  status: 'valid' | 'expired' | 'pending';
  expiryDate: Date;
  documentNumber: string;
  issuer: string;
}

export class VehicleComplianceEngine {
  private readonly COMPLIANCE_THRESHOLD = 80;
  private readonly MAX_PROCESSING_TIME = 10; // ms

  async checkVehicleCompliance(vehicleId: string): Promise<VehicleCompliance> {
    const startTime = Date.now();
    
    try {
      const [registration, insurance, maintenance, inspection] = await Promise.all([
        this.checkRegistrationStatus(vehicleId),
        this.checkInsuranceStatus(vehicleId),
        this.checkMaintenanceStatus(vehicleId),
        this.checkInspectionStatus(vehicleId)
      ]);

      const eligibilityScore = this.calculateEligibilityScore({
        registration,
        insurance,
        maintenance,
        inspection
      });

      const overallStatus = this.determineOverallStatus(eligibilityScore, {
        registration,
        insurance,
        maintenance,
        inspection
      });

      const processingTime = Date.now() - startTime;
      console.log(`Vehicle compliance checked for ${vehicleId} in ${processingTime}ms`);

      return {
        registrationStatus: registration,
        insuranceStatus: insurance,
        maintenanceStatus: maintenance,
        inspectionStatus: inspection,
        eligibilityScore,
        overallStatus
      };
    } catch (error) {
      throw new Error(`Failed to check vehicle compliance: ${error}`);
    }
  }

  async trackMaintenanceSchedule(vehicleId: string): Promise<MaintenanceSchedule> {
    const vehicle = await this.getVehicleData(vehicleId);
    const alerts = await this.generateMaintenanceAlerts(vehicleId);
    
    return {
      vehicleId,
      nextService: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lastService: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      serviceType: 'routine',
      mileage: vehicle.mileage || 45000,
      alerts
    };
  }

  async verifyEligibility(vehicleId: string, deliveryType: string): Promise<boolean> {
    const compliance = await this.checkVehicleCompliance(vehicleId);
    const vehicle = await this.getVehicleData(vehicleId);
    
    // Basic eligibility checks
    if (compliance.overallStatus === 'non_compliant') {
      return false;
    }

    // Delivery type specific checks
    switch (deliveryType) {
      case 'heavy_items':
        return vehicle.maxWeight >= 50 && compliance.eligibilityScore >= 90;
      case 'fragile_items':
        return compliance.eligibilityScore >= 85;
      case 'express':
        return compliance.eligibilityScore >= 80 && vehicle.type === 'motorcycle';
      default:
        return compliance.eligibilityScore >= this.COMPLIANCE_THRESHOLD;
    }
  }

  async getVehicleOverview(vehicleId: string): Promise<any> {
    const compliance = await this.checkVehicleCompliance(vehicleId);
    const vehicle = await this.getVehicleData(vehicleId);
    
    return {
      registeredVehicle: `${vehicle.type} - ${vehicle.make} ${vehicle.model}`,
      maxAllowedWeight: `${vehicle.maxWeight}kg`,
      verificationStatus: compliance.overallStatus === 'compliant' ? 'Verified' : 'Pending',
      registrationNumber: vehicle.registrationNumber,
      insuranceExpiry: vehicle.insuranceExpiry,
      lastInspection: vehicle.lastInspection,
      nextInspection: vehicle.nextInspection,
      fuelType: vehicle.fuelType,
      engineCapacity: vehicle.engineCapacity
    };
  }

  async getVehicleMaintenance(vehicleId: string): Promise<any> {
    const schedule = await this.trackMaintenanceSchedule(vehicleId);
    const compliance = await this.checkVehicleCompliance(vehicleId);
    
    return {
      lastInspection: schedule.lastService.toISOString().split('T')[0],
      nextInspection: schedule.nextService.toISOString().split('T')[0],
      overallStatus: compliance.overallStatus === 'compliant' ? 'Compliant' : 'Needs Attention',
      maintenanceAlerts: schedule.alerts,
      serviceHistory: [
        {
          date: schedule.lastService.toISOString().split('T')[0],
          type: 'Routine Maintenance',
          status: 'Completed',
          cost: 85000
        }
      ]
    };
  }

  async getVehicleEligibility(vehicleId: string): Promise<any> {
    const vehicle = await this.getVehicleData(vehicleId);
    const compliance = await this.checkVehicleCompliance(vehicleId);
    
    return [
      {
        type: 'Standard Deliveries',
        eligible: compliance.eligibilityScore >= 80,
        maxWeight: `${vehicle.maxWeight}kg`,
        maxDimensions: '60x40x40cm'
      },
      {
        type: 'Heavy Item Deliveries',
        eligible: vehicle.maxWeight >= 50 && compliance.eligibilityScore >= 85,
        maxWeight: `${vehicle.maxWeight}kg`,
        restrictions: vehicle.maxWeight < 50 ? ['Weight capacity exceeded'] : []
      },
      {
        type: 'Express Deliveries',
        eligible: vehicle.type === 'motorcycle' && compliance.eligibilityScore >= 80,
        maxWeight: `${vehicle.maxWeight}kg`,
        restrictions: vehicle.type !== 'motorcycle' ? ['Requires motorcycle'] : []
      }
    ];
  }

  private async checkRegistrationStatus(vehicleId: string): Promise<VehicleCompliance['registrationStatus']> {
    // Simulate registration check
    return 'valid';
  }

  private async checkInsuranceStatus(vehicleId: string): Promise<VehicleCompliance['insuranceStatus']> {
    // Simulate insurance check
    return 'active';
  }

  private async checkMaintenanceStatus(vehicleId: string): Promise<VehicleCompliance['maintenanceStatus']> {
    // Simulate maintenance check
    return 'current';
  }

  private async checkInspectionStatus(vehicleId: string): Promise<VehicleCompliance['inspectionStatus']> {
    // Simulate inspection check
    return 'passed';
  }

  private calculateEligibilityScore(statuses: any): number {
    let score = 100;
    
    if (statuses.registration !== 'valid') score -= 30;
    if (statuses.insurance !== 'active') score -= 25;
    if (statuses.maintenance === 'overdue') score -= 20;
    if (statuses.inspection !== 'passed') score -= 25;
    
    return Math.max(0, score);
  }

  private determineOverallStatus(score: number, statuses: any): VehicleCompliance['overallStatus'] {
    if (score >= 90 && statuses.registration === 'valid' && statuses.insurance === 'active') {
      return 'compliant';
    } else if (score >= 70) {
      return 'warning';
    } else {
      return 'non_compliant';
    }
  }

  private async getVehicleData(vehicleId: string): Promise<any> {
    // Simulate vehicle data retrieval
    return {
      type: 'motorcycle',
      make: 'Honda',
      model: 'CB300R',
      maxWeight: 50,
      registrationNumber: 'TZS 123 AB',
      insuranceExpiry: '2026-08-15',
      lastInspection: '2025-12-01',
      nextInspection: '2026-06-01',
      fuelType: 'Petrol',
      engineCapacity: '300cc',
      mileage: 45000
    };
  }

  private async generateMaintenanceAlerts(vehicleId: string): Promise<MaintenanceAlert[]> {
    // Simulate maintenance alerts
    return [
      {
        type: 'service_due',
        severity: 'medium',
        message: 'Routine service due in 30 days',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        actionRequired: 'Schedule routine maintenance'
      }
    ];
  }
}