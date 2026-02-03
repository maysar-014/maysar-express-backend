/**
 * Report Security Breach DTOs
 * DTO Firewall Rule: No Domain Entity crosses service boundary
 */

export namespace ReportSecurityBreachDTO {
  export interface Request {
    userId: string;
    breachType: 'suspicious_login' | 'multiple_failed_attempts' | 'unusual_activity' | 'location_anomaly';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    reportedBy?: string;
  }

  export interface Response {
    success: boolean;
    message: string;
    alertId?: string;
  }
}
