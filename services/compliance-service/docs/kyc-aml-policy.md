# KYC & AML Policy — Tanzania Market (BOT / FATF Guidelines)

## 1. Regulatory References
- Bank of Tanzania: Anti-Money Laundering Act (2006, amended 2019)
- FATF Recommendation 10 (Customer Due Diligence)
- Tanzania Financial Intelligence Unit (FIU) reporting obligations

## 2. KYC Tiers
| Tier | Status | Required Documents | Transaction Limits (TZS) |
|------|--------|-------------------|--------------------------|
| 0 | pending / rejected / expired | None | No transactions |
| 1 | submitted / under_review | National ID or Passport | Up to 1,000,000/month |
| 2 | approved | National ID + Proof of Address + Selfie | Up to 10,000,000/month |

## 3. AML Thresholds
- Transactions ≥ TZS 10,000,000 in a single day trigger enhanced due diligence
- Cumulative monthly volume ≥ TZS 50,000,000 requires FIU Suspicious Activity Report (SAR)
- High-risk jurisdictions: automatic SAR regardless of amount

## 4. Risk Level Definitions
| riskLevel | Description | Monitoring Frequency |
|-----------|-------------|---------------------|
| low | Clean sanctions/PEP checks, low-volume transactions | Quarterly |
| medium | Incomplete checks or moderate volume | Monthly |
| high | Positive sanctions/PEP hit or anomalous patterns | Immediate SAR |

## 5. Document Retention
- Per Compliance_DataRetentionPolicy: KYC documents retained for 5 years post-account closure
- Deletion governed by compliance_data_deletion_logs

## 6. Status Lifecycle
[Reference kyc-lifecycle.mmd state machine]
PENDING → SUBMITTED → UNDER_REVIEW → APPROVED / REJECTED → EXPIRED → re-SUBMITTED
