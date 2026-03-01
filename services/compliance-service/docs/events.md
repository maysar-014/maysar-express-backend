# Compliance Service - Events

## Events Emitted

### SuspiciousActivityDetected
- **Topic**: `compliance.suspicious.activity`
- **Payload**: `{ activityId, userId, activityType, riskScore }`
- **Consumers**: security-monitoring, support-service

### ComplianceReportGenerated
- **Topic**: `compliance.report.generated`
- **Payload**: `{ reportId, reportType, period, generatedAt }`
- **Consumers**: analytics-service

## Events Consumed

### All Transaction Events
- Monitors: order.created, payment.captured, wallet.debited
- Purpose: AML/KYC compliance checks
