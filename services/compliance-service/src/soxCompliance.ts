import { PrismaClient } from '@prisma/client';
import { EventBus } from './shared/events/eventBus';

const prisma = new PrismaClient();
const eventBus = new EventBus();

export interface SOXControl {
  id: string;
  controlId: string;
  controlArea: 'access_control' | 'change_management' | 'financial_reporting' | 'data_integrity' | 'segregation_duties';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  owner: string;
  status: 'effective' | 'ineffective' | 'compensating_control';
  lastTested: Date;
  nextReviewDate: Date;
  evidence?: string[];
  findings?: string[];
  remediation?: string[];
}

export interface SOXAComplianceRecord {
  id: string;
  controlId: string;
  controlArea: string;
  assessmentDate: Date;
  assessor: string;
  status: 'compliant' | 'non_compliant' | 'remediation_required' | 'under_review';
  findings?: string[];
  remediation?: string[];
  nextReviewDate: Date;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  compensatingControls?: string[];
}

export class SOXComplianceService {
  /**
   * Conduct SOX compliance assessment for a specific control
   */
  async assessControl(
    controlId: string,
    assessorId: string,
    findings?: string[],
    remediation?: string[]
  ): Promise<SOXAComplianceRecord> {
    // Get control details
    const control = await this.getControlById(controlId);
    if (!control) {
      throw new Error(`SOX control ${controlId} not found`);
    }

    // Determine status based on findings
    const status = this.determineControlStatus(findings);
    const riskLevel = this.assessRiskLevel(findings || []);

    // Calculate next review date
    const nextReviewDate = this.calculateNextReviewDate(control.frequency);

    // Create assessment record
    const record = await prisma.sOXAComplianceRecord.create({
      data: {
        controlId,
        controlArea: control.controlArea,
        assessmentDate: new Date(),
        assessor: assessorId,
        status,
        findings,
        remediation,
        nextReviewDate,
      },
    });

    // Update control status
    await this.updateControlStatus(controlId, status, new Date(), nextReviewDate);

    // Emit event
    await eventBus.publish('SOXControlAssessed.v1', {
      recordId: record.id,
      controlId,
      controlArea: control.controlArea,
      status,
      riskLevel,
      assessor: assessorId,
      assessmentDate: record.assessmentDate,
      findingsCount: findings?.length || 0,
    });

    return {
      id: record.id,
      controlId: record.controlId,
      controlArea: record.controlArea,
      assessmentDate: record.assessmentDate,
      assessor: record.assessor,
      status,
      findings,
      remediation,
      nextReviewDate,
      riskLevel,
    };
  }

  /**
   * Get all SOX controls
   */
  async getAllControls(): Promise<SOXControl[]> {
    // Return predefined SOX controls (would be stored in database in production)
    return [
      {
        id: 'SOX-001',
        controlId: 'SOX-001',
        controlArea: 'access_control',
        description: 'User access reviews conducted quarterly',
        frequency: 'quarterly',
        owner: 'IT Security',
        status: 'effective',
        lastTested: new Date('2024-10-01'),
        nextReviewDate: new Date('2025-01-01'),
        evidence: ['Access review logs', 'Approval records'],
      },
      {
        id: 'SOX-002',
        controlId: 'SOX-002',
        controlArea: 'change_management',
        description: 'Production changes require dual approval',
        frequency: 'monthly',
        owner: 'DevOps',
        status: 'effective',
        lastTested: new Date('2024-11-15'),
        nextReviewDate: new Date('2024-12-15'),
        evidence: ['Change management tickets', 'Approval workflows'],
      },
      {
        id: 'SOX-003',
        controlId: 'SOX-003',
        controlArea: 'financial_reporting',
        description: 'Financial data reconciliation procedures',
        frequency: 'monthly',
        owner: 'Finance',
        status: 'effective',
        lastTested: new Date('2024-11-30'),
        nextReviewDate: new Date('2024-12-31'),
        evidence: ['Reconciliation reports', 'Variance analysis'],
      },
      {
        id: 'SOX-004',
        controlId: 'SOX-004',
        controlArea: 'data_integrity',
        description: 'Database backup and recovery testing',
        frequency: 'quarterly',
        owner: 'Database Team',
        status: 'effective',
        lastTested: new Date('2024-09-30'),
        nextReviewDate: new Date('2024-12-31'),
        evidence: ['Backup logs', 'Recovery test results'],
      },
      {
        id: 'SOX-005',
        controlId: 'SOX-005',
        controlArea: 'segregation_duties',
        description: 'Segregation of duties matrix maintained',
        frequency: 'annually',
        owner: 'Compliance',
        status: 'effective',
        lastTested: new Date('2024-06-30'),
        nextReviewDate: new Date('2025-06-30'),
        evidence: ['Role definitions', 'Access matrices'],
      },
    ];
  }

  /**
   * Get SOX compliance status and metrics
   */
  async getComplianceStatus(): Promise<any> {
    const controls = await this.getAllControls();
    const records = await prisma.sOXAComplianceRecord.findMany({
      orderBy: { assessmentDate: 'desc' },
    });

    const totalControls = controls.length;
    const assessedControls = new Set(records.map(r => r.controlId)).size;
    const compliantControls = records.filter(r => r.status === 'compliant').length;
    const nonCompliantControls = records.filter(r =>
      r.status === 'non_compliant' || r.status === 'remediation_required'
    ).length;

    const overdueControls = controls.filter(control => {
      const latestAssessment = records
        .filter(r => r.controlId === control.controlId)
        .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())[0];

      if (!latestAssessment) return true;
      return latestAssessment.nextReviewDate < new Date();
    }).length;

    const complianceRate = totalControls > 0 ? (compliantControls / totalControls) * 100 : 0;

    return {
      totalControls,
      assessedControls,
      compliantControls,
      nonCompliantControls,
      overdueControls,
      complianceRate: Math.round(complianceRate * 100) / 100,
      overallStatus: this.determineOverallStatus(complianceRate, nonCompliantControls, overdueControls),
      lastUpdated: new Date(),
      nextReviewDate: this.getNextReviewDate(controls),
    };
  }

  /**
   * Get controls requiring attention
   */
  async getControlsRequiringAttention(): Promise<SOXControl[]> {
    const controls = await this.getAllControls();
    const records = await prisma.sOXAComplianceRecord.findMany();

    return controls.filter(control => {
      // Check if control is overdue
      if (control.nextReviewDate < new Date()) return true;

      // Check if control has recent non-compliant assessments
      const recentRecords = records
        .filter(r => r.controlId === control.controlId)
        .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())
        .slice(0, 3); // Last 3 assessments

      return recentRecords.some(r => r.status !== 'compliant');
    });
  }

  /**
   * Generate SOX audit trail report
   */
  async generateAuditTrailReport(startDate: Date, endDate: Date): Promise<any> {
    const records = await prisma.sOXAComplianceRecord.findMany({
      where: {
        assessmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { assessmentDate: 'asc' },
    });

    const controls = await this.getAllControls();
    const controlMap = new Map(controls.map(c => [c.controlId, c]));

    const report = {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalAssessments: records.length,
        compliantAssessments: records.filter(r => r.status === 'compliant').length,
        nonCompliantAssessments: records.filter(r => r.status !== 'compliant').length,
        controlsAssessed: new Set(records.map(r => r.controlId)).size,
      },
      assessments: records.map(record => ({
        controlId: record.controlId,
        controlArea: record.controlArea,
        controlDescription: controlMap.get(record.controlId)?.description || 'Unknown',
        assessmentDate: record.assessmentDate,
        assessor: record.assessor,
        status: record.status,
        findings: record.findings,
        remediation: record.remediation,
        riskLevel: this.assessRiskLevel(record.findings || []),
      })),
      generatedAt: new Date(),
    };

    // Emit report generation event
    await eventBus.publish('SOXAuditTrailReportGenerated.v1', {
      reportId: `sox_report_${Date.now()}`,
      period: report.period,
      assessmentCount: report.summary.totalAssessments,
      generatedAt: report.generatedAt,
    });

    return report;
  }

  /**
   * Update control status
   */
  private async updateControlStatus(
    controlId: string,
    status: string,
    lastTested: Date,
    nextReviewDate: Date
  ): Promise<void> {
    // In a real implementation, this would update a controls table
    // For now, this is a placeholder
    console.log(`Updated SOX control ${controlId}: status=${status}, lastTested=${lastTested}, nextReview=${nextReviewDate}`);
  }

  /**
   * Get control by ID
   */
  private async getControlById(controlId: string): Promise<SOXControl | null> {
    const controls = await this.getAllControls();
    return controls.find(c => c.controlId === controlId) || null;
  }

  /**
   * Determine control status based on findings
   */
  private determineControlStatus(findings?: string[]): 'compliant' | 'non_compliant' | 'remediation_required' | 'under_review' {
    if (!findings || findings.length === 0) {
      return 'compliant';
    }

    const criticalFindings = findings.filter(f =>
      f.toLowerCase().includes('critical') ||
      f.toLowerCase().includes('major') ||
      f.toLowerCase().includes('severe')
    );

    if (criticalFindings.length > 0) {
      return 'non_compliant';
    }

    return 'remediation_required';
  }

  /**
   * Assess risk level based on findings
   */
  private assessRiskLevel(findings: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (findings.length === 0) return 'low';

    const highRiskKeywords = ['breach', 'unauthorized', 'critical', 'severe', 'non-compliant'];
    const hasHighRisk = findings.some(f =>
      highRiskKeywords.some(keyword => f.toLowerCase().includes(keyword))
    );

    if (hasHighRisk) return 'critical';
    if (findings.length > 3) return 'high';
    if (findings.length > 1) return 'medium';
    return 'low';
  }

  /**
   * Calculate next review date based on frequency
   */
  private calculateNextReviewDate(frequency: string): Date {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case 'quarterly':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case 'annually':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Determine overall SOX compliance status
   */
  private determineOverallStatus(
    complianceRate: number,
    nonCompliantControls: number,
    overdueControls: number
  ): string {
    if (complianceRate >= 95 && nonCompliantControls === 0 && overdueControls === 0) {
      return 'excellent';
    }
    if (complianceRate >= 90 && nonCompliantControls <= 2 && overdueControls === 0) {
      return 'good';
    }
    if (complianceRate >= 80 && nonCompliantControls <= 5) {
      return 'requires_attention';
    }
    return 'critical';
  }

  /**
   * Get next review date across all controls
   */
  private getNextReviewDate(controls: SOXControl[]): Date {
    const dates = controls.map(c => c.nextReviewDate);
    return new Date(Math.min(...dates.map(d => d.getTime())));
  }
}

// Event handlers for SOX compliance
export class SOXEventHandlers {
  private soxService: SOXComplianceService;

  constructor() {
    this.soxService = new SOXComplianceService();
  }

  async handleSOXControlReviewDue(event: any): Promise<void> {
    console.log('SOX control review due:', event.controlId);

    // Trigger review reminder
    await eventBus.publish('SOXControlReviewReminder.v1', {
      controlId: event.controlId,
      controlArea: event.controlArea,
      dueDate: event.dueDate,
      reminderType: 'review_due',
    });
  }

  async handleSOXComplianceCheck(event: any): Promise<void> {
    console.log('Running SOX compliance check');

    // Generate compliance report
    const status = await this.soxService.getComplianceStatus();

    if (status.overallStatus === 'critical' || status.overallStatus === 'requires_attention') {
      await eventBus.publish('SOXComplianceAlert.v1', {
        status: status.overallStatus,
        complianceRate: status.complianceRate,
        nonCompliantControls: status.nonCompliantControls,
        overdueControls: status.overdueControls,
        alertDate: new Date(),
      });
    }
  }
}
