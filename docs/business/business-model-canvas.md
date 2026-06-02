# Maysar Express — Business Model Canvas

> Platform: Digital Community Trade Marketplace (Tanzania)
> Model: Multi-sided marketplace with Enabler network, COD-first payments, and logistics orchestration.

---

## Canvas Overview

```mermaid
graph TB
    subgraph BMC["🟦 BUSINESS MODEL CANVAS — MAYSAR EXPRESS"]

        subgraph KP["KEY PARTNERS"]
            KP1["📦 Suppliers / Manufacturers\n(Bulk production & inventory)"]
            KP2["🚚 Courier Partners\n(Last-mile delivery network)"]
            KP3["💳 PaymentGateway / M-Pesa\n(Payment gateway)"]
            KP4["📡 Africa's Talking\n(SMS notifications)"]
            KP5["🗺️ Google Maps\n(Route optimization)"]
            KP6["☁️ AWS / Supabase\n(Cloud infrastructure)"]
        end

        subgraph KA["KEY ACTIVITIES"]
            KA1["🛒 Marketplace Operations\n(Catalog, orders, fulfillment)"]
            KA2["🤝 Enabler Network Management\n(Onboarding, training, attribution)"]
            KA3["🔐 Trust & Compliance\n(KYC, AML, fraud scoring)"]
            KA4["💰 Financial Orchestration\n(Wallet, escrow, payouts)"]
            KA5["📊 Analytics & Intelligence\n(Buy-box, pricing, performance)"]
            KA6["🚀 Logistics Coordination\n(Routing, COD, tracking)"]
        end

        subgraph KR["KEY RESOURCES"]
            KR1["🏗️ Platform Technology\n(Modular monolith, 22 services)"]
            KR2["👥 Enabler Network\n(Trained field agents)"]
            KR3["📋 Seller Catalog\n(Product listings & buy-box data)"]
            KR4["💼 Wallet Infrastructure\n(COD commitment, escrow)"]
            KR5["📈 Data Assets\n(COD reputation, fraud scores)"]
        end

        subgraph VP["VALUE PROPOSITIONS"]
            VP1["🛍️ For Buyers\nSafe COD shopping with\nwallet pre-auth & OTP delivery"]
            VP2["🏪 For Sellers\nReach + Enabler network\n+ Buy-box competition"]
            VP3["🤝 For Enablers\nEarn commissions by\nassisting sales & onboarding"]
            VP4["🏭 For Suppliers\nBulk order pipeline\n+ production planning"]
            VP5["🚴 For Couriers\nFlexible earnings +\nroute optimization"]
        end

        subgraph CR["CUSTOMER RELATIONSHIPS"]
            CR1["📱 Self-service App\n(Buyer storefront)"]
            CR2["🎓 Enabler-assisted Sales\n(Field agent support)"]
            CR3["🎫 Support Tickets\n(In-platform resolution)"]
            CR4["📣 Community Features\n(Posts, reviews, ratings)"]
        end

        subgraph CH["CHANNELS"]
            CH1["📲 Mobile App\n(Buyer & Courier)"]
            CH2["💻 Seller Console\n(Web dashboard)"]
            CH3["🤝 Enabler Network\n(Field agents)"]
            CH4["📧 Email + SMS\n(Notifications)"]
        end

        subgraph CS["CUSTOMER SEGMENTS"]
            CS1["🛒 Buyers\n(Urban & peri-urban Tanzania)"]
            CS2["🏪 Sellers / SMEs\n(Registered businesses)"]
            CS3["🏭 Suppliers\n(Manufacturers & wholesalers)"]
            CS4["🤝 Enablers\n(Trained sales facilitators)"]
            CS5["🚴 Couriers\n(Independent delivery partners)"]
        end

        subgraph CS2_["COST STRUCTURE"]
            COST1["🖥️ Infrastructure\n(Cloud, DB, Redis, CDN)"]
            COST2["👷 Engineering & Ops\n(Platform maintenance)"]
            COST3["📣 Enabler Commissions\n(15-20% of assisted sales)"]
            COST4["🚚 Logistics Subsidies\n(Route optimization costs)"]
            COST5["🔐 Compliance & KYC\n(Regulatory overhead)"]
        end

        subgraph RS["REVENUE STREAMS"]
            REV1["💰 Seller Commission\n8% of GMV per order"]
            REV2["🤝 Enabler Commission\n15-20% of assisted sale value"]
            REV3["🛒 Buyer Service Fee\n3-1% sliding scale"]
            REV4["📦 Logistics Fees\n Delivery charges"]
            REV5["🎓 Training Fees\n(Enabler certification)"]
            REV6["📊 Analytics Premium\n(Seller intelligence)"]
        end

    end

    style BMC fill:#f8f9fa,stroke:#dee2e6
    style KP fill:#e3f2fd,stroke:#1565c0
    style KA fill:#e8f5e9,stroke:#2e7d32
    style KR fill:#fff3e0,stroke:#e65100
    style VP fill:#fce4ec,stroke:#880e4f
    style CR fill:#f3e5f5,stroke:#4a148c
    style CH fill:#e0f7fa,stroke:#006064
    style CS fill:#fff8e1,stroke:#f57f17
    style CS2_ fill:#fbe9e7,stroke:#bf360c
    style RS fill:#e8eaf6,stroke:#1a237e
```

---

## Revenue Model Detail

```mermaid
pie title Revenue Stream Breakdown (Projected GMV Share)
    "Seller Commission (8% GMV)" : 45
    "Enabler Commission (15-20%)" : 25
    "Buyer Service Fee (3-1%)" : 10
    "Logistics Fees" : 12
    "Training & Certification" : 4
    "Analytics Premium" : 4
```

---

## Platform Flywheel

```mermaid
graph LR
    A["More Sellers\nJoin Platform"] -->|"Better product\nselection"| B["More Buyers\nShop"]
    B -->|"More orders\nto fulfill"| C["More Couriers\nEarn"]
    C -->|"Faster delivery\nbuilds trust"| D["Higher COD\nConversion"]
    D -->|"More revenue\nfor sellers"| A
    B -->|"Enablers earn\ncommissions"| E["More Enablers\nOnboard"]
    E -->|"Assisted sales\nreach new buyers"| B
    D -->|"Data moat grows\n(COD reputation)"| F["Fraud Scores\nImprove"]
    F -->|"Lower risk\nenables more COD"| D

    style A fill:#4CAF50,color:#fff
    style B fill:#2196F3,color:#fff
    style C fill:#FF9800,color:#fff
    style D fill:#9C27B0,color:#fff
    style E fill:#F44336,color:#fff
    style F fill:#009688,color:#fff
```

---

## Unit Economics

| Metric | Value |
|--------|-------|
| Blended Take Rate | 10–12% of GMV |
| Seller Commission | 8% base |
| Enabler Commission | 15–20% of assisted sale |
| Buyer Service Fee | 3% → 1% (sliding scale) |
| CAC : LTV Ratio | 30:1 (excellent) |
| Break-even Orders/Month | ~500 orders |
| Infrastructure Cost (Launch) | ~$500/month |
| Infrastructure Cost (10K orders/day) | ~$1,200/month |
