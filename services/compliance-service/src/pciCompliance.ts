import { PrismaClient } from '@prisma/client';
import { EventBus } from '../shared/events/eventBus';

const prisma = new PrismaClient();
const eventBus = new EventBus();

export interface PCIVulnerability {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cve?: string;
  description: string;
  affectedSystems: string[];
  remediationSteps: string[];
  status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk';
  discoveredAt: Date;
  remediatedAt?: Date;
  dueDate: Date;
}

export interface PCIComplianceRecord {
  id: string;
  assessmentDate: Date;
  assessor: string;
  complianceLevel: 'level1' | 'level2' | 'level3' | 'level4';
  expiryDate: Date;
  vulnerabilities: PCIVulnerability[];
  remediationPlan: {
    priority: string;
    timeline: string;
    responsible: string;
    status: string;
  }[];
  overallStatus: 'compliant' | 'non_compliant' | 'compensating_controls';
  nextAssessmentDate: Date;
}

export class PCIComplianceService {
  /**
   * Conduct PCI DSS compliance assessment
   */
  async conductAssessment(
    assessorId: string,
    complianceLevel: 'level1' | 'level2' | 'level3' | 'level4',
    scope: string[]
  ): Promise<PCIComplianceRecord> {
    // Run automated vulnerability scans
    const vulnerabilities = await this.runAutomatedVulnerabilityScan(scope);

    // Assess compliance requirements
    const complianceStatus = await this.assessComplianceRequirements(complianceLevel, vulnerabilities);

    // Generate remediation plan
    const remediationPlan = await this.generateRemediationPlan(vulnerabilities);

    // Calculate next assessment date based on level
    const nextAssessmentDate = this.calculateNextAssessmentDate(complianceLevel);

    // Create compliance record
    const record = await prisma.pCIComplianceRecord.create({
      data: {
        assessmentDate: new Date(),
        assessor: assessorId,
        complianceLevel,
        expiryDate: nextAssessmentDate,
        vulnerabilities: vulnerabilities,
        remediationPlan,
        status: complianceStatus,
      },
    });

    // Emit compliance event
    await eventBus.publish('PCIAssessmentCompleted.v1', {
      recordId: record.id,
      complianceLevel,
      status: complianceStatus,
      vulnerabilityCount: vulnerabilities.length,
      criticalVulnerabilities: vulnerabilities.filter(v => v.severity === 'critical').length,
      assessmentDate: record.assessmentDate,
      expiryDate: record.expiryDate,
    });

    return {
      id: record.id,
      assessmentDate: record.assessmentDate,
      assessor: record.assessor,
      complianceLevel: record.complianceLevel,
      expiryDate: record.expiryDate,
      vulnerabilities,
      remediationPlan,
      overallStatus: complianceStatus,
      nextAssessmentDate,
    };
  }

  /**
   * Run automated vulnerability scan
   */
  public async runAutomatedVulnerabilityScan(scope: string[]): Promise<PCIVulnerability[]> {
    // This would integrate with vulnerability scanning tools
    // For now, return mock vulnerabilities

    const mockVulnerabilities: PCIVulnerability[] = [
      {
        id: 'vuln_001',
        title: 'SSL/TLS Configuration Weakness',
        severity: 'high',
        cve: 'CVE-2023-12345',
        description: 'Outdated SSL/TLS configuration allows weak cipher suites',
        affectedSystems: ['payment-gateway', 'api-gateway'],
        remediationSteps: [
          'Update SSL/TLS configuration to use only TLS 1.3',
          'Disable weak cipher suites',
          'Implement perfect forward secrecy',
        ],
        status: 'open',
        discoveredAt: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        id: 'vuln_002',
        title: 'Unencrypted Data at Rest',
        severity: 'critical',
        description: 'Payment data stored without proper encryption',
        affectedSystems: ['payment-service', 'database'],
        remediationSteps: [
          'Implement AES-256 encryption for all payment data',
          'Rotate existing unencrypted data',
          'Update encryption keys using KMS',
        ],
        status: 'in_progress',
        discoveredAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    ];

    return mockVulnerabilities;
  }

  /**
   * Assess compliance requirements against PCI DSS
   */
  private async assessComplianceRequirements(
    level: string,
    vulnerabilities: PCIVulnerability[]
  ): Promise<'compliant' | 'non_compliant' | 'compensating_controls'> {
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    const highVulns = vulnerabilities.filter(v => v.severity === 'high');

    // PCI DSS requirements assessment
    const requirements = {
      // Build and maintain a secure network and systems
      firewall: true,
      systemPasswords: true,

      // Protect cardholder data
      dataEncryption: criticalVulns.length === 0,
      dataMasking: true,

      // Maintain a vulnerability management program
      vulnerabilityScanning: vulnerabilities.length < 5,
      patchManagement: highVulns.length === 0,

      // Implement strong access control measures
      accessControls: true,
      uniqueIds: true,

      // Regularly monitor and test networks
      logging: true,
      testing: true,

      // Maintain an information security policy
      securityPolicy: true,
      riskAssessment: true,
    };

    const failingRequirements = Object.entries(requirements)
      .filter(([_, compliant]) => !compliant)
      .map(([requirement, _]) => requirement);

    if (failingRequirements.length === 0) {
      return 'compliant';
    }

    // Check if compensating controls are in place
    const hasCompensatingControls = await this.checkCompensatingControls(failingRequirements);
    return hasCompensatingControls ? 'compensating_controls' : 'non_compliant';
  }

  /**
   * Generate remediation plan for vulnerabilities
   */
  private async generateRemediationPlan(vulnerabilities: PCIVulnerability[]): Promise<any[]> {
    const plan = [];

    for (const vuln of vulnerabilities) {
      const priority = this.calculatePriority(vuln);
      const timeline = this.calculateTimeline(vuln.severity);
      const responsible = this.assignResponsibleParty(vuln.affectedSystems);

      plan.push({
        vulnerabilityId: vuln.id,
        title: vuln.title,
        severity: vuln.severity,
        priority,
        timeline,
        responsible,
        status: vuln.status,
        dueDate: vuln.dueDate,
      });
    }

    return plan.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.severity] - priorityOrder[b.severity];
    });
  }

  /**
   * Check if compensating controls exist for failing requirements
   */
  private async checkCompensatingControls(failingRequirements: string[]): Promise<boolean> {
    // Check if compensating controls are documented and approved
    for (const requirement of failingRequirements) {
      const control = await prisma.compensatingControl.findFirst({
        where: {
          requirement,
          status: 'approved',
          expiryDate: { gt: new Date() },
        },
      });

      if (!control) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get PCI compliance status and metrics
   */
  async getComplianceStatus(): Promise<any> {
    const latestAssessment = await prisma.pCIComplianceRecord.findFirst({
      orderBy: { assessmentDate: 'desc' },
    });

    if (!latestAssessment) {
      return {
        status: 'no_assessment',
        message: 'No PCI DSS assessment has been conducted',
        daysUntilNextAssessment: null,
      };
    }

    const daysUntilExpiry = Math.ceil(
      (latestAssessment.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    const openVulnerabilities = latestAssessment.vulnerabilities.filter(
      (v: any) => v.status === 'open' || v.status === 'in_progress'
    );

    return {
      status: latestAssessment.status,
      lastAssessmentDate: latestAssessment.assessmentDate,
      nextAssessmentDate: latestAssessment.expiryDate,
      daysUntilNextAssessment: daysUntilExpiry,
      complianceLevel: latestAssessment.complianceLevel,
      openVulnerabilities: openVulnerabilities.length,
      criticalVulnerabilities: openVulnerabilities.filter((v: any) => v.severity === 'critical').length,
      remediationProgress: this.calculateRemediationProgress(latestAssessment.remediationPlan),
    };
  }

  /**
   * Update vulnerability status
   */
  async updateVulnerabilityStatus(
    recordId: string,
    vulnerabilityId: string,
    status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk',
    notes?: string
  ): Promise<void> {
    const record = await prisma.pCIComplianceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new Error('PCI compliance record not found');
    }

    const vulnerabilities = record.vulnerabilities.map((vuln: any) => {
      if (vuln.id === vulnerabilityId) {
        return {
          ...vuln,
          status,
          remediatedAt: status === 'remediated' ? new Date() : vuln.remediatedAt,
          notes,
        };
      }
      return vuln;
    });

    await prisma.pCIComplianceRecord.update({
      where: { id: recordId },
      data: { vulnerabilities },
    });

    // Emit event
    await eventBus.publish('PCIVulnerabilityUpdated.v1', {
      recordId,
      vulnerabilityId,
      status,
      updatedAt: new Date(),
    });
  }

  /**
   * Calculate priority based on vulnerability severity and business impact
   */
  private calculatePriority(vuln: PCIVulnerability): string {
    if (vuln.severity === 'critical') return 'P0 - Critical';
    if (vuln.severity === 'high') return 'P1 - High';
    if (vuln.severity === 'medium') return 'P2 - Medium';
    return 'P3 - Low';
  }

  /**
   * Calculate timeline based on severity
   */
  private calculateTimeline(severity: string): string {
    switch (severity) {
      case 'critical': return '7 days';
      case 'high': return '30 days';
      case 'medium': return '90 days';
      case 'low': return '180 days';
      default: return '90 days';
    }
  }

  /**
   * Assign responsible party based on affected systems
   */
  private assignResponsibleParty(affectedSystems: string[]): string {
    if (affectedSystems.includes('payment-service')) return 'Payment Team';
    if (affectedSystems.includes('api-gateway')) return 'Platform Team';
    if (affectedSystems.includes('database')) return 'Data Team';
    return 'Security Team';
  }

  /**
   * Calculate next assessment date based on PCI level
   */
  private calculateNextAssessmentDate(level: string): Date {
    const now = new Date();
    switch (level) {
      case 'level1': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      case 'level2': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      case 'level3': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      case 'level4': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      default: return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate remediation progress
   */
  private calculateRemediationProgress(remediationPlan: any[]): number {
    if (remediationPlan.length === 0) return 100;

    const completed = remediationPlan.filter(item => item.status === 'completed').length;
    return Math.round((completed / remediationPlan.length) * 100);
  }
}

// Event handlers for PCI compliance
export class PCIEventHandlers {
  private pciService: PCIComplianceService;

  constructor() {
    this.pciService = new PCIComplianceService();
  }

  async handlePCIAssessmentDue(event: any): Promise<void> {
    console.log('PCI DSS assessment due');

    // Trigger assessment reminder
    await eventBus.publish('PCIAssessmentReminder.v1', {
      dueDate: event.dueDate,
      complianceLevel: event.complianceLevel,
      reminderType: 'assessment_due',
    });
  }

  async handlePCIVulnerabilityScan(event: any): Promise<void> {
    console.log('Running scheduled PCI vulnerability scan');

    // Run automated scan
    const vulnerabilities = await this.pciService.runAutomatedVulnerabilityScan(['all']);

    if (vulnerabilities.length > 0) {
      await eventBus.publish('PCIVulnerabilitiesFound.v1', {
        vulnerabilityCount: vulnerabilities.length,
        criticalCount: vulnerabilities.filter(v => v.severity === 'critical').length,
        scanDate: new Date(),
      });
    }
  }
}
