# Maysar Express — User Flow Maps

> All persona journeys mapped end-to-end with happy paths, decision points, and failure states.

---

## 1. Buyer Journey — Discovery to Delivery

```mermaid
flowchart TD
    START(["👤 Buyer Opens App"]) --> BROWSE["Browse / Search Products"]
    BROWSE --> FILTER["Filter by Category\nPrice · Location · Rating"]
    FILTER --> PDP["View Product Detail Page\n(Buy-box winner shown)"]
    PDP --> STOCK{Stock\nAvailable?}
    STOCK -->|No| OOS["Out of Stock\nShow alternatives"]
    STOCK -->|Yes| CART["Add to Cart"]
    CART --> CHECKOUT["Initiate Checkout\n(Address · Shipping · Payment)"]
    CHECKOUT --> PAYMENT_METHOD{Payment\nMethod?}

    PAYMENT_METHOD -->|"Mobile Money\n/ Card"| GATEWAY["Pesapal Gateway\nFraud Check → Charge"]
    PAYMENT_METHOD -->|"Wallet"| WALLET_PAY["Debit Wallet Balance"]
    PAYMENT_METHOD -->|"COD"| COD_LOCK["Lock COD Commitment\nin Wallet"]

    GATEWAY --> PAY_RESULT{Payment\nResult?}
    WALLET_PAY --> PAY_RESULT
    COD_LOCK --> PAY_RESULT

    PAY_RESULT -->|Success| ORDER_CONFIRMED["Order Confirmed ✅\nNotification Sent"]
    PAY_RESULT -->|Failed| PAY_FAIL["Payment Failed ❌\nStock Released\nRetry Options Shown"]

    ORDER_CONFIRMED --> DISPATCH["Courier Assigned\nShipment Created"]
    DISPATCH --> TRACKING["Real-time Tracking\n(Status Updates via SMS/Push)"]
    TRACKING --> DELIVERY{Delivery\nOutcome?}

    DELIVERY -->|"Delivered\n(COD: OTP verified)"| COMPLETE["Order Complete ✅\nWallet/Payout Settled"]
    DELIVERY -->|"Failed Delivery"| REDELIVER["Rescheduled or\nReturned to Seller"]
    DELIVERY -->|"Buyer Cancels"| CANCEL["Cancellation Flow\nRefund Initiated"]

    CANCEL --> REFUND["Refund Processed\n(Original payment method)"]

    style START fill:#4CAF50,color:#fff
    style ORDER_CONFIRMED fill:#2196F3,color:#fff
    style COMPLETE fill:#4CAF50,color:#fff
    style PAY_FAIL fill:#F44336,color:#fff
    style OOS fill:#FF9800,color:#fff
```

---

## 2. Seller Journey — Onboarding to Payout

```mermaid
flowchart TD
    START(["🏪 Seller Registers"]) --> BIZ_REG["Register Business\n(Business Registry)"]
    BIZ_REG --> KYC["Submit KYC Documents\n(ID · Business Cert · Tax)"]
    KYC --> KYC_REVIEW{KYC\nReview}
    KYC_REVIEW -->|Rejected| KYC_FAIL["Rejection Notice\nResubmit Documents"]
    KYC_REVIEW -->|Approved| VERIFIED["Business Verified ✅"]

    VERIFIED --> CATALOG["Create Product Listings\n(Title · Variants · Pricing · Images)"]
    CATALOG --> PUBLISH{Publish\nProduct?}
    PUBLISH -->|"Quality Score < 60"| IMPROVE["Improve Listing\n(SEO · Images · Description)"]
    PUBLISH -->|"Quality Score ≥ 60"| LIVE["Product Live 🟢\nBuy-box Competition Starts"]

    LIVE --> ORDER_IN["Order Received 📦\nNotification Sent"]
    ORDER_IN --> FULFILL["Prepare & Pack Order"]
    FULFILL --> HANDOFF["Hand Off to Courier\n(Pickup Confirmed)"]
    HANDOFF --> DELIVERED["Delivery Confirmed ✅"]

    DELIVERED --> COMMISSION_CALC["Commission Calculated\n(8% platform fee)"]
    COMMISSION_CALC --> WALLET_CREDIT["Earnings Credited\nto Seller Wallet"]
    WALLET_CREDIT --> PAYOUT_REQ["Request Payout\n(Bank Transfer / Mobile Money)"]
    PAYOUT_REQ --> PAYOUT_DONE["Payout Disbursed 💰"]

    style START fill:#4CAF50,color:#fff
    style LIVE fill:#2196F3,color:#fff
    style PAYOUT_DONE fill:#9C27B0,color:#fff
    style KYC_FAIL fill:#F44336,color:#fff
```

---

## 3. Enabler Journey — Onboarding to Commission

```mermaid
flowchart TD
    START(["🤝 Enabler Registers"]) --> PROFILE["Create Enabler Profile"]
    PROFILE --> TRAINING["Complete Onboarding Training\n(Modules + Assessment)"]
    TRAINING --> CERT{Assessment\nPassed?}
    CERT -->|Failed| RETRY["Retry Assessment\n(Notification Sent)"]
    CERT -->|Passed| CERTIFIED["Certified Enabler ✅"]

    CERTIFIED --> SHARE["Share Product Links\nwith Referral Code"]
    SHARE --> BUYER_CLICKS["Buyer Clicks Link\n(Attribution Tracked)"]
    BUYER_CLICKS --> ORDER_PLACED["Buyer Places Order\n(Enabler Code Attached)"]
    ORDER_PLACED --> ORDER_COMPLETE{Order\nCompleted?}

    ORDER_COMPLETE -->|No| NO_COMMISSION["No Commission\n(Attribution Lost)"]
    ORDER_COMPLETE -->|Yes| COMMISSION["Commission Calculated\n(15-20% of sale value)"]
    COMMISSION --> WALLET_CREDIT["Commission Credited\nto Enabler Wallet"]
    WALLET_CREDIT --> PAYOUT["Request Payout 💰"]

    CERTIFIED --> SELLER_ASSIST["Assist Seller Onboarding\n(Earn Onboarding Bonus)"]
    SELLER_ASSIST --> SELLER_VERIFIED["Seller Verified\nBonus Credited"]

    style START fill:#4CAF50,color:#fff
    style CERTIFIED fill:#2196F3,color:#fff
    style COMMISSION fill:#9C27B0,color:#fff
    style NO_COMMISSION fill:#F44336,color:#fff
```

---

## 4. Courier Journey — Assignment to Earnings

```mermaid
flowchart TD
    START(["🚴 Courier Goes Online"]) --> AVAIL["Set Availability: Online\n(Location Shared)"]
    AVAIL --> ASSIGN["Delivery Assignment\n(Route Optimized via Maps)"]
    ASSIGN --> ACCEPT{Accept\nDelivery?}
    ACCEPT -->|Declined| QUEUE["Order Returns\nto Queue"]
    ACCEPT -->|Accepted| PICKUP["Navigate to Pickup\n(GPS Tracking Active)"]

    PICKUP --> PICKUP_CONFIRM["Confirm Pickup\n(Status: In Transit)"]
    PICKUP_CONFIRM --> DELIVER["Navigate to Delivery Address"]
    DELIVER --> COD_CHECK{Is COD\nOrder?}

    COD_CHECK -->|No| DELIVER_CONFIRM["Confirm Delivery ✅\n(Photo Proof)"]
    COD_CHECK -->|Yes| OTP_COLLECT["Collect Cash from Buyer\nEnter OTP from Buyer"]
    OTP_COLLECT --> OTP_VALID{OTP\nValid?}
    OTP_VALID -->|Invalid| OTP_RETRY["Retry OTP\n(Max 3 attempts)"]
    OTP_VALID -->|Valid| COD_CONFIRM["COD Verified ✅\nCash Collected"]
    COD_CONFIRM --> DELIVER_CONFIRM

    DELIVER_CONFIRM --> EARNINGS["Delivery Earnings\nCredited to Wallet"]
    EARNINGS --> PAYOUT["Request Payout\n(Weekly Settlement)"]

    style START fill:#4CAF50,color:#fff
    style DELIVER_CONFIRM fill:#2196F3,color:#fff
    style EARNINGS fill:#9C27B0,color:#fff
    style OTP_RETRY fill:#FF9800,color:#fff
```

---

## 5. Admin Journey — Oversight & Control

```mermaid
flowchart TD
    START(["🔐 Admin Logs In\n(2FA Required)"]) --> DASHBOARD["Admin Dashboard\n(KPIs · Alerts · Queues)"]

    DASHBOARD --> KYC_QUEUE["Review KYC Queue\n(Pending Verifications)"]
    KYC_QUEUE --> KYC_DECISION{KYC\nDecision}
    KYC_DECISION -->|Approve| KYC_APPROVE["Approve Business\nNotify Seller"]
    KYC_DECISION -->|Reject| KYC_REJECT["Reject with Reason\nNotify Seller"]

    DASHBOARD --> DISPUTE["Review Disputes\n(Order / Payment Issues)"]
    DISPUTE --> DISPUTE_ACTION{Resolution}
    DISPUTE_ACTION -->|Refund| FORCE_REFUND["Force Refund\nAudit Logged"]
    DISPUTE_ACTION -->|Dismiss| DISMISS["Dismiss Ticket\nNotify Parties"]

    DASHBOARD --> USER_MGMT["User Management\n(Suspend · Ban · Unlock)"]
    USER_MGMT --> AUDIT["All Actions\nAudit Logged"]

    DASHBOARD --> COMPLIANCE_REVIEW["Compliance Review\n(AML · TCRA · TRA)"]
    COMPLIANCE_REVIEW --> FLAG{Suspicious\nActivity?}
    FLAG -->|Yes| FREEZE["Freeze Account\nEscalate to Compliance"]
    FLAG -->|No| CLEAR["Mark Clear\nContinue Monitoring"]

    style START fill:#F44336,color:#fff
    style DASHBOARD fill:#2196F3,color:#fff
    style AUDIT fill:#FF9800,color:#fff
```
