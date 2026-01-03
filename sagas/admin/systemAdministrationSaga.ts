import { Saga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

export interface ServiceHealthData {
  serviceId: string;
  serviceName: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'down';
  metrics: any;
  alerts: any[];
}

export class ServiceHealthMonitoringSaga extends Saga {
  constructor() {
    super('ServiceHealthMonitoring');
  }

  async execute(context: SagaContext<ServiceHealthData>): Promise<void> {
    await this.addStep(new HealthCheckStep());
    await this.addStep(new MetricsCollectionStep());
    await this.addStep(new AlertEvaluationStep());
    await this.addStep(new IncidentCreationStep());
    await this.addStep(new NotificationStep());
  }
}

class HealthCheckStep extends SagaStep {
  async execute(context: SagaContext<ServiceHealthData>): Promise<void> {
    const { serviceId, serviceName } = context.data;
    
    await eventBus.publish('ServiceHealthCheckStarted.v1', {
      serviceId,
      serviceName,
      sagaId: context.sagaId,
      checkStartedAt: new Date()
    });

    const healthStatus = await this.performHealthCheck(serviceId);
    
    await eventBus.publish('ServiceHealthCheckCompleted.v1', {
      serviceId,
      serviceName,
      healthStatus,
      sagaId: context.sagaId,
      checkCompletedAt: new Date()
    });
  }

  private async performHealthCheck(serviceId: string): Promise<string> {
    try {
      // Mock health check logic
      const checks = await Promise.all([
        this.checkServiceAvailability(serviceId),
        this.checkDatabaseConnection(serviceId),
        this.checkExternalDependencies(serviceId),
        this.checkResourceUtilization(serviceId)
      ]);

      const failedChecks = checks.filter(check => !check.passed);
      
      if (failedChecks.length === 0) return 'healthy';
      if (failedChecks.length <= 1) return 'degraded';
      if (failedChecks.length <= 2) return 'unhealthy';
      return 'down';
    } catch (error) {
      return 'down';
    }
  }

  private async checkServiceAvailability(serviceId: string): Promise<any> {
    return { passed: true, responseTime: 150 };
  }

  private async checkDatabaseConnection(serviceId: string): Promise<any> {
    return { passed: true, connectionTime: 50 };
  }

  private async checkExternalDependencies(serviceId: string): Promise<any> {
    return { passed: true, dependenciesHealthy: ['redis', 'kafka'] };
  }

  private async checkResourceUtilization(serviceId: string): Promise<any> {
    return { passed: true, cpu: 45, memory: 60, disk: 30 };
  }

  async compensate(context: SagaContext<ServiceHealthData>): Promise<void> {
    await eventBus.publish('ServiceHealthCheckCancelled.v1', {
      serviceId: context.data.serviceId,
      sagaId: context.sagaId
    });
  }
}

class MetricsCollectionStep extends SagaStep {
  async execute(context: SagaContext<ServiceHealthData>): Promise<void> {
    const { serviceId, serviceName } = context.data;
    
    const metrics = await this.collectServiceMetrics(serviceId);
    
    await eventBus.publish('ServiceMetricsCollected.v1', {
      serviceId,
      serviceName,
      metrics,
      sagaId: context.sagaId,
      collectedAt: new Date()
    });
  }

  private async collectServiceMetrics(serviceId: string): Promise<any> {
    return {
      responseTime: {
        p50: 120,
        p95: 250,
        p99: 500
      },
      throughput: {
        requestsPerSecond: 150,
        requestsPerMinute: 9000
      },
      errorRate: {
        percentage: 0.5,
        count: 45
      },
      resources: {
        cpuUsage: 45,
        memoryUsage: 60,
        diskUsage: 30
      },
      dependencies: {
        database: { status: 'healthy', responseTime: 50 },
        redis: { status: 'healthy', responseTime: 10 },
        kafka: { status: 'healthy', lag: 100 }
      }
    };
  }

  async compensate(context: SagaContext<ServiceHealthData>): Promise<void> {
    await eventBus.publish('ServiceMetricsCollectionCancelled.v1', {
      serviceId: context.data.serviceId,
      sagaId: context.sagaId
    });
  }
}

class AlertEvaluationStep extends SagaStep {
  async execute(context: SagaContext<ServiceHealthData>): Promise<void> {
    const { serviceId, serviceName, healthStatus, metrics } = context.data;
    
    const alerts = await this.evaluateAlerts(serviceId, healthStatus, metrics);
    
    await eventBus.publish('ServiceAlertsEvaluated.v1', {
      serviceId,
      serviceName,
      alerts,
      sagaId: context.sagaId,
      evaluatedAt: new Date()
    });
  }

  private async evaluateAlerts(serviceId: string, healthStatus: string, metrics: any): Promise<any[]> {
    const alerts = [];

    // Health status alerts
    if (healthStatus === 'down') {
      alerts.push({
        type: 'service_down',
        severity: 'critical',
        message: `Service ${serviceId} is down`,
        threshold: 'availability < 100%'
      });
    } else if (healthStatus === 'unhealthy') {
      alerts.push({
        type: 'service_unhealthy',
        severity: 'high',
        message: `Service ${serviceId} is unhealthy`,
        threshold: 'multiple health checks failing'
      });
    }

    // Performance alerts
    if (metrics?.responseTime?.p95 > 1000) {
      alerts.push({
        type: 'high_response_time',
        severity: 'medium',
        message: `High response time detected: ${metrics.responseTime.p95}ms`,
        threshold: 'p95 > 1000ms'
      });
    }

    // Error rate alerts
    if (metrics?.errorRate?.percentage > 5) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `High error rate: ${metrics.errorRate.percentage}%`,
        threshold: 'error rate > 5%'
      });
    }

    // Resource alerts
    if (metrics?.resources?.cpuUsage > 80) {
      alerts.push({
        type: 'high_cpu_usage',
        severity: 'medium',
        message: `High CPU usage: ${metrics.resources.cpuUsage}%`,
        threshold: 'CPU > 80%'
      });
    }

    return alerts;
  }

  async compensate(context: SagaContext<ServiceHealthData>): Promise<void> {
    await eventBus.publish('ServiceAlertEvaluationCancelled.v1', {
      serviceId: context.data.serviceId,
      sagaId: context.sagaId
    });
  }
}

class IncidentCreationStep extends SagaStep {
  async execute(context: SagaContext<ServiceHealthData>): Promise<void> {
    const { serviceId, serviceName, alerts } = context.data;
    
    const criticalAlerts = alerts?.filter(alert => alert.severity === 'critical') || [];
    
    if (criticalAlerts.length > 0) {
      const incidentId = await this.createIncident(serviceId, serviceName, criticalAlerts);
      
      await eventBus.publish('ServiceIncidentCreated.v1', {
        incidentId,
        serviceId,
        serviceName,
        alerts: criticalAlerts,
        sagaId: context.sagaId,
        createdAt: new Date()
      });
    }
  }

  private async createIncident(serviceId: string, serviceName: string, alerts: any[]): Promise<string> {
    const incidentId = `INC-${Date.now()}`;
    
    // Create incident record
    await eventBus.publish('IncidentCreated.v1', {
      incidentId,
      title: `Service ${serviceName} Critical Issue`,
      description: `Critical alerts detected for service ${serviceId}`,
      severity: 'critical',
      status: 'open',
      assignedTo: 'on-call-engineer',
      alerts
    });

    return incidentId;
  }

  async compensate(context: SagaContext<ServiceHealthData>): Promise<void> {
    await eventBus.publish('ServiceIncidentCreationCancelled.v1', {
      serviceId: context.data.serviceId,
      sagaId: context.sagaId
    });
  }
}

class NotificationStep extends SagaStep {
  async execute(context: SagaContext<ServiceHealthData>): Promise<void> {
    const { serviceId, serviceName, healthStatus, alerts } = context.data;
    
    await this.sendNotifications(serviceId, serviceName, healthStatus, alerts || []);
    
    await eventBus.publish('ServiceHealthNotificationsSent.v1', {
      serviceId,
      serviceName,
      healthStatus,
      alertCount: alerts?.length || 0,
      sagaId: context.sagaId,
      notifiedAt: new Date()
    });
  }

  private async sendNotifications(serviceId: string, serviceName: string, healthStatus: string, alerts: any[]): Promise<void> {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    const highAlerts = alerts.filter(alert => alert.severity === 'high');

    // Send critical alerts immediately
    if (criticalAlerts.length > 0) {
      await eventBus.publish('CriticalAlertNotification.v1', {
        serviceId,
        serviceName,
        alerts: criticalAlerts,
        channels: ['slack', 'email', 'sms', 'pagerduty']
      });
    }

    // Send high severity alerts
    if (highAlerts.length > 0) {
      await eventBus.publish('HighSeverityAlertNotification.v1', {
        serviceId,
        serviceName,
        alerts: highAlerts,
        channels: ['slack', 'email']
      });
    }

    // Send health status updates
    if (healthStatus !== 'healthy') {
      await eventBus.publish('ServiceHealthStatusNotification.v1', {
        serviceId,
        serviceName,
        healthStatus,
        channels: ['slack', 'dashboard']
      });
    }
  }

  async compensate(context: SagaContext<ServiceHealthData>): Promise<void> {
    // No compensation needed for notifications
  }
}

export interface SecurityIncidentData {
  incidentId: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: any;
}

export class SecurityIncidentResponseSaga extends Saga {
  constructor() {
    super('SecurityIncidentResponse');
  }

  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await this.addStep(new IncidentDetectionStep());
    await this.addStep(new ThreatAssessmentStep());
    await this.addStep(new ContainmentStep());
    await this.addStep(new InvestigationStep());
    await this.addStep(new RemediationStep());
    await this.addStep(new RecoveryStep());
  }
}

class IncidentDetectionStep extends SagaStep {
  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    const { incidentId, incidentType, severity, source } = context.data;
    
    await eventBus.publish('SecurityIncidentDetected.v1', {
      incidentId,
      incidentType,
      severity,
      source,
      detectedAt: new Date(),
      sagaId: context.sagaId
    });

    await this.validateIncident(context.data);
  }

  private async validateIncident(data: SecurityIncidentData): Promise<void> {
    const validTypes = [
      'unauthorized_access',
      'data_breach',
      'malware_detection',
      'ddos_attack',
      'insider_threat',
      'phishing_attempt',
      'vulnerability_exploit'
    ];

    if (!validTypes.includes(data.incidentType)) {
      throw new Error(`Invalid incident type: ${data.incidentType}`);
    }
  }

  async compensate(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await eventBus.publish('SecurityIncidentDetectionCancelled.v1', {
      incidentId: context.data.incidentId,
      sagaId: context.sagaId
    });
  }
}

class ThreatAssessmentStep extends SagaStep {
  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    const { incidentId, incidentType, details } = context.data;
    
    const threatAssessment = await this.assessThreat(incidentType, details);
    
    await eventBus.publish('SecurityThreatAssessed.v1', {
      incidentId,
      threatAssessment,
      sagaId: context.sagaId,
      assessedAt: new Date()
    });
  }

  private async assessThreat(incidentType: string, details: any): Promise<any> {
    return {
      riskLevel: this.calculateRiskLevel(incidentType),
      impactScope: this.assessImpactScope(incidentType, details),
      urgency: this.determineUrgency(incidentType),
      affectedSystems: this.identifyAffectedSystems(details),
      potentialDamage: this.assessPotentialDamage(incidentType)
    };
  }

  private calculateRiskLevel(incidentType: string): string {
    const riskMap: Record<string, string> = {
      'data_breach': 'critical',
      'unauthorized_access': 'high',
      'malware_detection': 'high',
      'ddos_attack': 'medium',
      'insider_threat': 'high',
      'phishing_attempt': 'medium',
      'vulnerability_exploit': 'high'
    };
    return riskMap[incidentType] || 'medium';
  }

  private assessImpactScope(incidentType: string, details: any): string {
    // Assess how widespread the impact could be
    return 'localized'; // or 'widespread', 'system-wide'
  }

  private determineUrgency(incidentType: string): string {
    const urgentTypes = ['data_breach', 'ddos_attack', 'malware_detection'];
    return urgentTypes.includes(incidentType) ? 'immediate' : 'high';
  }

  private identifyAffectedSystems(details: any): string[] {
    return details?.affectedSystems || ['unknown'];
  }

  private assessPotentialDamage(incidentType: string): any {
    return {
      dataLoss: incidentType === 'data_breach',
      serviceDisruption: ['ddos_attack', 'malware_detection'].includes(incidentType),
      reputationalDamage: ['data_breach', 'unauthorized_access'].includes(incidentType),
      financialImpact: 'medium'
    };
  }

  async compensate(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await eventBus.publish('SecurityThreatAssessmentCancelled.v1', {
      incidentId: context.data.incidentId,
      sagaId: context.sagaId
    });
  }
}

class ContainmentStep extends SagaStep {
  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    const { incidentId, incidentType, severity } = context.data;
    
    const containmentActions = await this.executeContainment(incidentType, severity);
    
    await eventBus.publish('SecurityIncidentContained.v1', {
      incidentId,
      containmentActions,
      sagaId: context.sagaId,
      containedAt: new Date()
    });
  }

  private async executeContainment(incidentType: string, severity: string): Promise<string[]> {
    const actions = [];

    switch (incidentType) {
      case 'unauthorized_access':
        actions.push('disable_compromised_accounts');
        actions.push('reset_access_tokens');
        actions.push('enable_additional_monitoring');
        break;
      
      case 'data_breach':
        actions.push('isolate_affected_systems');
        actions.push('preserve_evidence');
        actions.push('notify_stakeholders');
        break;
      
      case 'malware_detection':
        actions.push('quarantine_infected_systems');
        actions.push('block_malicious_traffic');
        actions.push('update_security_rules');
        break;
      
      case 'ddos_attack':
        actions.push('enable_ddos_protection');
        actions.push('block_attack_sources');
        actions.push('scale_infrastructure');
        break;
    }

    // Execute containment actions
    for (const action of actions) {
      await this.executeContainmentAction(action);
    }

    return actions;
  }

  private async executeContainmentAction(action: string): Promise<void> {
    await eventBus.publish('ContainmentActionExecuted.v1', {
      action,
      executedAt: new Date()
    });
  }

  async compensate(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await eventBus.publish('SecurityContainmentReverted.v1', {
      incidentId: context.data.incidentId,
      sagaId: context.sagaId
    });
  }
}

class InvestigationStep extends SagaStep {
  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    const { incidentId, incidentType } = context.data;
    
    const investigation = await this.conductInvestigation(incidentId, incidentType);
    
    await eventBus.publish('SecurityInvestigationCompleted.v1', {
      incidentId,
      investigation,
      sagaId: context.sagaId,
      completedAt: new Date()
    });
  }

  private async conductInvestigation(incidentId: string, incidentType: string): Promise<any> {
    return {
      rootCause: await this.identifyRootCause(incidentType),
      timeline: await this.constructTimeline(incidentId),
      evidence: await this.collectEvidence(incidentId),
      impactAssessment: await this.assessActualImpact(incidentId)
    };
  }

  private async identifyRootCause(incidentType: string): Promise<string> {
    const causes: Record<string, string> = {
      'unauthorized_access': 'weak_password_policy',
      'data_breach': 'unpatched_vulnerability',
      'malware_detection': 'phishing_email',
      'ddos_attack': 'botnet_attack'
    };
    return causes[incidentType] || 'unknown';
  }

  private async constructTimeline(incidentId: string): Promise<any[]> {
    return [
      { time: '10:00', event: 'Initial detection' },
      { time: '10:05', event: 'Alert triggered' },
      { time: '10:10', event: 'Investigation started' },
      { time: '10:15', event: 'Containment initiated' }
    ];
  }

  private async collectEvidence(incidentId: string): Promise<any> {
    return {
      logs: ['security.log', 'access.log', 'system.log'],
      networkTraffic: 'captured',
      systemSnapshots: 'preserved',
      userActivity: 'analyzed'
    };
  }

  private async assessActualImpact(incidentId: string): Promise<any> {
    return {
      affectedUsers: 0,
      dataCompromised: false,
      serviceDowntime: '5 minutes',
      financialLoss: 0
    };
  }

  async compensate(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await eventBus.publish('SecurityInvestigationCancelled.v1', {
      incidentId: context.data.incidentId,
      sagaId: context.sagaId
    });
  }
}

class RemediationStep extends SagaStep {
  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    const { incidentId, incidentType } = context.data;
    
    const remediationActions = await this.executeRemediation(incidentType);
    
    await eventBus.publish('SecurityRemediationCompleted.v1', {
      incidentId,
      remediationActions,
      sagaId: context.sagaId,
      completedAt: new Date()
    });
  }

  private async executeRemediation(incidentType: string): Promise<string[]> {
    const actions = [];

    switch (incidentType) {
      case 'unauthorized_access':
        actions.push('patch_vulnerability');
        actions.push('strengthen_access_controls');
        actions.push('implement_mfa');
        break;
      
      case 'data_breach':
        actions.push('encrypt_sensitive_data');
        actions.push('implement_dlp_controls');
        actions.push('update_privacy_policies');
        break;
      
      case 'malware_detection':
        actions.push('update_antivirus_signatures');
        actions.push('patch_systems');
        actions.push('enhance_email_filtering');
        break;
    }

    return actions;
  }

  async compensate(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await eventBus.publish('SecurityRemediationReverted.v1', {
      incidentId: context.data.incidentId,
      sagaId: context.sagaId
    });
  }
}

class RecoveryStep extends SagaStep {
  async execute(context: SagaContext<SecurityIncidentData>): Promise<void> {
    const { incidentId } = context.data;
    
    await this.executeRecovery(incidentId);
    
    await eventBus.publish('SecurityIncidentRecoveryCompleted.v1', {
      incidentId,
      sagaId: context.sagaId,
      recoveredAt: new Date()
    });
  }

  private async executeRecovery(incidentId: string): Promise<void> {
    // Restore normal operations
    await eventBus.publish('SystemRecoveryInitiated.v1', {
      incidentId,
      recoveryActions: [
        'restore_services',
        'validate_system_integrity',
        'resume_normal_operations',
        'update_documentation'
      ]
    });
  }

  async compensate(context: SagaContext<SecurityIncidentData>): Promise<void> {
    await eventBus.publish('SecurityRecoveryCancelled.v1', {
      incidentId: context.data.incidentId,
      sagaId: context.sagaId
    });
  }
}