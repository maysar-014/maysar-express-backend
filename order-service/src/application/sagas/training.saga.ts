export enum TrainingModule {
  SAFETY_BASICS = 'safety_basics',
  CUSTOMER_SERVICE = 'customer_service',
  DELIVERY_PROCEDURES = 'delivery_procedures',
  VEHICLE_MAINTENANCE = 'vehicle_maintenance',
  EMERGENCY_PROTOCOLS = 'emergency_protocols'
}

export enum TrainingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

export interface TrainingRecord {
  courierId: string;
  module: TrainingModule;
  status: TrainingStatus;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  attempts: number;
  expiresAt?: Date;
}

export interface CertificationRequirement {
  module: TrainingModule;
  minimumScore: number;
  validityPeriod: number; // days
  mandatory: boolean;
}

export class TrainingSaga {
  private readonly certificationRequirements: CertificationRequirement[] = [
    { module: TrainingModule.SAFETY_BASICS, minimumScore: 80, validityPeriod: 365, mandatory: true },
    { module: TrainingModule.CUSTOMER_SERVICE, minimumScore: 75, validityPeriod: 180, mandatory: true },
    { module: TrainingModule.DELIVERY_PROCEDURES, minimumScore: 85, validityPeriod: 365, mandatory: true },
    { module: TrainingModule.VEHICLE_MAINTENANCE, minimumScore: 70, validityPeriod: 180, mandatory: false },
    { module: TrainingModule.EMERGENCY_PROTOCOLS, minimumScore: 90, validityPeriod: 365, mandatory: true }
  ];

  async startTraining(courierId: string, module: TrainingModule): Promise<TrainingRecord> {
    const existingRecord = await this.getTrainingRecord(courierId, module);
    
    if (existingRecord && existingRecord.status === TrainingStatus.IN_PROGRESS) {
      return existingRecord;
    }

    const trainingRecord: TrainingRecord = {
      courierId,
      module,
      status: TrainingStatus.IN_PROGRESS,
      startedAt: new Date(),
      attempts: existingRecord ? existingRecord.attempts + 1 : 1
    };

    await this.saveTrainingRecord(trainingRecord);
    return trainingRecord;
  }

  async completeTraining(courierId: string, module: TrainingModule, score: number): Promise<TrainingRecord> {
    const trainingRecord = await this.getTrainingRecord(courierId, module);
    
    if (!trainingRecord || trainingRecord.status !== TrainingStatus.IN_PROGRESS) {
      throw new Error('Training not in progress');
    }

    const requirement = this.certificationRequirements.find(req => req.module === module);
    const passed = score >= (requirement?.minimumScore || 70);

    trainingRecord.status = passed ? TrainingStatus.COMPLETED : TrainingStatus.FAILED;
    trainingRecord.completedAt = new Date();
    trainingRecord.score = score;

    if (passed && requirement) {
      trainingRecord.expiresAt = new Date(Date.now() + requirement.validityPeriod * 24 * 60 * 60 * 1000);
    }

    await this.saveTrainingRecord(trainingRecord);

    // Check if courier is now eligible for deliveries
    if (passed) {
      await this.checkDeliveryEligibility(courierId);
    }

    return trainingRecord;
  }

  async checkDeliveryEligibility(courierId: string): Promise<{ eligible: boolean; missingRequirements: TrainingModule[] }> {
    const mandatoryRequirements = this.certificationRequirements.filter(req => req.mandatory);
    const missingRequirements: TrainingModule[] = [];

    for (const requirement of mandatoryRequirements) {
      const record = await this.getTrainingRecord(courierId, requirement.module);
      
      if (!record || 
          record.status !== TrainingStatus.COMPLETED || 
          this.isTrainingExpired(record)) {
        missingRequirements.push(requirement.module);
      }
    }

    const eligible = missingRequirements.length === 0;

    // Update courier eligibility status
    await this.updateCourierEligibility(courierId, eligible);

    return { eligible, missingRequirements };
  }

  async getTrainingProgress(courierId: string): Promise<{
    completed: TrainingRecord[];
    inProgress: TrainingRecord[];
    required: TrainingModule[];
    eligible: boolean;
  }> {
    const allRecords = await this.getAllTrainingRecords(courierId);
    
    const completed = allRecords.filter(record => 
      record.status === TrainingStatus.COMPLETED && !this.isTrainingExpired(record)
    );
    
    const inProgress = allRecords.filter(record => 
      record.status === TrainingStatus.IN_PROGRESS
    );

    const completedModules = completed.map(record => record.module);
    const required = this.certificationRequirements
      .filter(req => req.mandatory && !completedModules.includes(req.module))
      .map(req => req.module);

    const eligibilityCheck = await this.checkDeliveryEligibility(courierId);

    return {
      completed,
      inProgress,
      required,
      eligible: eligibilityCheck.eligible
    };
  }

  async scheduleRetraining(courierId: string): Promise<TrainingModule[]> {
    const allRecords = await this.getAllTrainingRecords(courierId);
    const modulesToRetrain: TrainingModule[] = [];

    for (const record of allRecords) {
      if (record.status === TrainingStatus.COMPLETED && this.isTrainingExpired(record)) {
        modulesToRetrain.push(record.module);
        
        // Mark as expired
        record.status = TrainingStatus.EXPIRED;
        await this.saveTrainingRecord(record);
      }
    }

    // Update courier eligibility if any mandatory training expired
    if (modulesToRetrain.some(module => 
      this.certificationRequirements.find(req => req.module === module)?.mandatory
    )) {
      await this.updateCourierEligibility(courierId, false);
    }

    return modulesToRetrain;
  }

  private isTrainingExpired(record: TrainingRecord): boolean {
    if (!record.expiresAt) return false;
    return new Date() > record.expiresAt;
  }

  private async getTrainingRecord(courierId: string, module: TrainingModule): Promise<TrainingRecord | null> {
    // Integration with database
    return null; // Placeholder
  }

  private async getAllTrainingRecords(courierId: string): Promise<TrainingRecord[]> {
    // Integration with database
    return []; // Placeholder
  }

  private async saveTrainingRecord(record: TrainingRecord): Promise<void> {
    // Integration with database
  }

  private async updateCourierEligibility(courierId: string, eligible: boolean): Promise<void> {
    // Integration with courier service
  }
}