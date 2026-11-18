# Maysar Express — Trust & Compliance Diagrams

> Covers: KYC/AML flows, fraud scoring, COD reputation, compliance checks, and platform trust mechanisms.

---

## 1. KYC Verification Flow

```mermaid
flowchart TD
    REGISTER["User / Business Registers"] --> SUBMIT_DOCS["Submit KYC Documents\n(ID · Business Cert · Tax ID · Bank)"]

    SUBMIT_DOCS --> AUTO_CHECK["Automated Pre-checks\n(Document format · Completeness)"]
    AUTO_CHECK --> AUTO_RESULT{Auto\nCheck}
    AUTO_RESULT -->|Failed| REJECT_AUTO["Reject: Incomplete\nRequest Resubmission"]
    AUTO_RESULT -->|Passed| QUEUE["Queue for Manual Review\n(Compliance Officer)"]

    QUEUE --> MANUAL_REVIEW["Manual KYC Review\n(Compliance Officer)"]
    MANUAL_REVIEW --> AML_CHECK["AML Screening\n(Sanctions · PEP · Risk Score)"]
    AML_CHECK --> AML_RESULT{AML\nResult}
    AML_RESULT -->|High Risk| FREEZE["Freeze Account\nEscalate to Compliance"]
    AML_RESULT -->|Clear| INTERNAL_TAX_CHECK["Internal Tax Compliance\nCheck"]

    INTERNAL_TAX_CHECK --> INTERNAL_TAX_RESULT{Internal Tax\nStatus}
    INTERNAL_TAX_RESULT -->|Non-compliant| HOLD["Hold Verification\nRequest Tax Docs"]
    INTERNAL_TAX_RESULT -->|Compliant| BUSINESS_REG_CHECK["Business Registration\nCheck"]

    BUSINESS_REG_CHECK --> FINAL_DECISION{Final\nDecision}
    FINAL_DECISION -->|Approved| VERIFIED["Business Verified ✅\nStatus: ACTIVE\nCan list products & receive payouts"]
    FINAL_DECISION -->|Rejected| REJECTED["Verification Rejected\nReason Provided\nAppeal Process Available"]

    VERIFIED --> PERIODIC["Periodic Re-verification\n(Annual compliance check)"]

    style VERIFIED fill:#4CAF50,color:#fff
    style REJECTED fill:#F44336,color:#fff
    style FREEZE fill:#F44336,color:#fff
```

---

## 2. Fraud Scoring System

```mermaid
graph TB
    subgraph Signals["Fraud Signal Inputs"]
        S1["📍 IP Address\n(Geolocation · VPN detection)"]
        S2["📱 Device Fingerprint\n(Browser · OS · Screen)"]
        S3["💳 Payment History\n(Chargebacks · Failures)"]
        S4["🛒 Order Patterns\n(Velocity · Amount · Frequency)"]
        S5["👤 Account Age\n(New vs established)"]
        S6["📦 COD History\n(Rejection rate · OTP failures)"]
        S7["🌍 Delivery Address\n(Known fraud zones)"]
    end

    subgraph Engine["Fraud Scoring Engine"]
        SCORE["Composite Fraud Score\n(0-100)"]
        RULES["Rule Engine\n(Configurable thresholds)"]
    end

    subgraph Thresholds["Score Thresholds"]
        LOW["0-30: Low Risk\n✅ Auto-approve"]
        MEDIUM["31-60: Medium Risk\n⚠️ Enhanced monitoring"]
        HIGH["61-80: High Risk\n🔍 Manual review required"]
        CRITICAL["81-100: Critical\n❌ Auto-reject + flag"]
    end

    subgraph Actions["Automated Actions"]
        APPROVE["Approve Payment"]
        MONITOR["Flag for Monitoring"]
        REVIEW["Queue for Manual Review"]
        BLOCK["Block Transaction\nNotify Compliance"]
    end

    Signals --> Engine
    Engine --> Thresholds
    LOW --> APPROVE
    MEDIUM --> MONITOR
    HIGH --> REVIEW
    CRITICAL --> BLOCK

    style LOW fill:#4CAF50,color:#fff
    style MEDIUM fill:#FF9800,color:#fff
    style HIGH fill:#FF5722,color:#fff
    style CRITICAL fill:#F44336,color:#fff
```

---

## 3. COD Reputation Scoring

```mermaid
graph TB
    subgraph CODHistory["COD Transaction History"]
        H1["✅ Successful COD Deliveries\n(+points)"]
        H2["❌ OTP Failures\n(-points)"]
        H3["🚫 Refused Deliveries\n(-points)"]
        H4["⏱️ Delivery Acceptance Rate\n(+/- points)"]
        H5["📍 Address Accuracy\n(+points)"]
    end

    subgraph Score["COD Reputation Score"]
        CALC["Weighted Score\n(0-100)"]
        DECAY["Time Decay\n(Recent events weighted more)"]
    end

    subgraph Limits["COD Limits by Score"]
        TIER1["Score 80-100\n💰 COD limit: 500,000 TZS\nNo pre-auth required"]
        TIER2["Score 50-79\n💰 COD limit: 200,000 TZS\nWallet pre-auth required"]
        TIER3["Score 20-49\n💰 COD limit: 50,000 TZS\nFull wallet commitment"]
        TIER4["Score 0-19\n❌ COD disabled\nPrepaid only"]
    end

    CODHistory --> Score
    Score --> Limits

    style TIER1 fill:#4CAF50,color:#fff
    style TIER2 fill:#8BC34A,color:#fff
    style TIER3 fill:#FF9800,color:#fff
    style TIER4 fill:#F44336,color:#fff
```

---

## 4. Platform Trust Architecture

```mermaid
graph TB
    subgraph TrustLayers["Trust Layers"]
        subgraph Identity["Identity Trust"]
            EMAIL_VERIFY["Email Verification"]
            PHONE_VERIFY["Phone OTP\n(Firebase)"]
            TWO_FA["2FA (TOTP)"]
            KYC_VERIFY["KYC Verification\n(Business)"]
        end

        subgraph Transaction["Transaction Trust"]
            FRAUD_SCORE["Fraud Scoring\n(Per transaction)"]
            IDEMPOTENCY["Idempotency Keys\n(Duplicate prevention)"]
            OPT_LOCK["Optimistic Locking\n(Concurrent updates)"]
            REDLOCK["Distributed Locks\n(Inventory · Wallet)"]
        end

        subgraph Delivery["Delivery Trust"]
            COD_REPUTATION["COD Reputation Score"]
            OTP_VERIFY["OTP Verification\n(Delivery confirmation)"]
            GPS_PROOF["GPS Proof\n(Delivery location)"]
            PHOTO_PROOF["Photo Proof\n(Delivery evidence)"]
        end

        subgraph Compliance["Internal Compliance"]
            AML["AML Screening\n(Sanctions · PEP)"]
            INTERNAL_TAX["Internal Tax Compliance\nCheck"]
            BUSINESS_REG["Business Registration\nCheck"]
            GDPR["Data Protection\n(GDPR-aligned)"]
        end
    end

    subgraph Monitoring["Trust Monitoring"]
        AUDIT_LOG["Audit Logs\n(All actions logged)"]
        RATE_LIMIT["Rate Limiting\n(Redis-backed)"]
        ANOMALY["Anomaly Detection\n(Pattern analysis)"]
        INCIDENT["Incident Playbook\n(Response procedures)"]
    end

    TrustLayers --> Monitoring

    style Identity fill:#e3f2fd,stroke:#1565c0
    style Transaction fill:#e8f5e9,stroke:#2e7d32
    style Delivery fill:#fff3e0,stroke:#e65100
    style Compliance fill:#fce4ec,stroke:#880e4f
```

---

## 5. Dispute Resolution Flow

```mermaid
flowchart TD
    DISPUTE_RAISED["Dispute Raised\n(Buyer / Seller)"] --> TICKET["Support Ticket Created\n(Auto-assigned priority)"]

    TICKET --> CATEGORY{Dispute\nCategory}

    CATEGORY -->|"Non-delivery"| NON_DELIVERY["Check Delivery Status\n(Logistics Service)"]
    CATEGORY -->|"Wrong Item"| WRONG_ITEM["Request Photo Evidence\nfrom Buyer"]
    CATEGORY -->|"Payment Issue"| PAYMENT_ISSUE["Check Payment Records\n(Payment Service)"]
    CATEGORY -->|"COD Dispute"| COD_DISPUTE["Check OTP Logs\n+ GPS Proof"]

    NON_DELIVERY --> DELIVERY_CHECK{Delivery\nConfirmed?}
    DELIVERY_CHECK -->|No| REFUND_BUYER["Issue Full Refund\nto Buyer"]
    DELIVERY_CHECK -->|Yes| EVIDENCE_REQUEST["Request Delivery\nProof from Courier"]

    WRONG_ITEM --> EVIDENCE_REVIEW["Review Photo Evidence"]
    EVIDENCE_REVIEW --> EVIDENCE_VALID{Evidence\nValid?}
    EVIDENCE_VALID -->|Yes| PARTIAL_REFUND["Issue Partial/Full Refund\nReturn Initiated"]
    EVIDENCE_VALID -->|No| DISMISS["Dismiss Dispute\nNotify Buyer"]

    PAYMENT_ISSUE --> PAYMENT_CHECK["Verify Payment Records\n(Gateway + Wallet)"]
    PAYMENT_CHECK --> PAYMENT_VALID{Payment\nConfirmed?}
    PAYMENT_VALID -->|Duplicate| REFUND_DUPLICATE["Refund Duplicate\nPayment"]
    PAYMENT_VALID -->|Failed| RETRY_PAYMENT["Retry Payment\nor Refund"]

    COD_DISPUTE --> OTP_LOGS["Review OTP Logs\n+ GPS Coordinates"]
    OTP_LOGS --> COD_VALID{COD\nVerified?}
    COD_VALID -->|Yes| RELEASE_FUNDS["Release Funds\nto Seller"]
    COD_VALID -->|No| HOLD_FUNDS["Hold Funds\nPending Investigation"]

    REFUND_BUYER & PARTIAL_REFUND & REFUND_DUPLICATE --> REFUND_PROCESS["Process Refund\n(Original payment method)"]
    REFUND_PROCESS --> NOTIFY_PARTIES["Notify All Parties\n(Buyer · Seller · Courier)"]
    NOTIFY_PARTIES --> CLOSE["Close Ticket\nAudit Logged"]

    style REFUND_BUYER fill:#4CAF50,color:#fff
    style DISMISS fill:#FF9800,color:#fff
    style HOLD_FUNDS fill:#F44336,color:#fff
    style CLOSE fill:#2196F3,color:#fff
```
