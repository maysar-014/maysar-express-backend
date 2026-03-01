# Compliance Service - Service Overview
Monitors transactions for AML/KYC compliance, flags suspicious activity, generates regulatory reports.

# Events
- SuspiciousActivityDetected, ComplianceReportGenerated

# Sagas
- ComplianceCheckSaga: Validates transactions against compliance rules

# Failure Matrix
| Step | Failure | Compensation | Timeout |
|------|---------|--------------|---------|
| Check Rules | Rule engine down | Alert | 10s |
| Flag Activity | Database timeout | Retry | 5s |

# Scaling
- Event-driven monitoring
- 1000 transactions/s

# Revenue Impact
- Regulatory compliance: Prevents platform shutdown
- Risk mitigation: Reduces fraud losses
